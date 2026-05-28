import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { availabilityCheck } from '@/lib/checker/availabilityCheck'
import { integrityCheck } from '@/lib/checker/integrityCheck'
import { driftCheck } from '@/lib/checker/driftCheck'
import { computeCanaryScore } from '@/lib/scoring/canaryScore'
import { sendAlert } from '@/lib/alerts/alertService'
import { MonitoredDataset } from '@/types'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSig = req.headers.get('x-vercel-cron-signature')
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    cronSig !== null

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const { data: datasets, error } = await supabaseAdmin
    .from('monitored_datasets')
    .select('*')

  if (error || !datasets) {
    return NextResponse.json({ error: 'Failed to fetch datasets' }, { status: 500 })
  }

  const due = datasets.filter((ds: MonitoredDataset) => {
    if (!ds.last_checked_at) return true
    const lastChecked = new Date(ds.last_checked_at)
    const minutesSince = (now.getTime() - lastChecked.getTime()) / 60000
    return minutesSince >= ds.check_interval_minutes
  })

  const results = await Promise.allSettled(due.map((ds: MonitoredDataset) => runCheck(ds, now)))

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ checked: due.length, succeeded, failed })
}

async function runCheck(dataset: MonitoredDataset, now: Date): Promise<void> {
  const availability = await availabilityCheck(dataset.dataset_url)

  let checksum: string | null = null
  let rowCount: number | null = null
  let schema: Record<string, string> = {}
  let stats: Record<string, unknown> = {}
  let checksumMatch: boolean | null = null
  let schemaDrift = false
  let driftDetails: Record<string, unknown> = {}
  let checkStatus: 'pass' | 'warn' | 'fail' = 'fail'

  if (availability.available) {
    try {
      const integrity = await integrityCheck(dataset.dataset_url, dataset.file_format)
      checksum = integrity.checksum
      rowCount = integrity.rowCount
      schema = integrity.schema
      stats = integrity.stats

      if (dataset.baseline_checksum) {
        checksumMatch = checksum === dataset.baseline_checksum
      }

      if (dataset.baseline_schema && Object.keys(dataset.baseline_schema).length > 0) {
        const drift = await driftCheck(
          { schema, stats: stats as Record<string, { nullRate: number; min?: number; max?: number; uniqueCount: number }>, rowCount: rowCount ?? 0 },
          { schema: dataset.baseline_schema, stats: dataset.baseline_stats as Record<string, { nullRate: number; min?: number; max?: number; uniqueCount: number }>, rowCount: dataset.baseline_row_count ?? 0 }
        )
        schemaDrift = drift.hasDrift
        driftDetails = drift.details as unknown as Record<string, unknown>
      }

      checkStatus = checksumMatch === false || schemaDrift ? 'warn' : 'pass'
    } catch (err) {
      console.error(`Integrity check failed for ${dataset.id}:`, err)
      checkStatus = 'warn'
    }
  }

  const rowCountDelta =
    rowCount !== null && dataset.baseline_row_count !== null
      ? rowCount - dataset.baseline_row_count
      : null

  const { data: checkResult } = await supabaseAdmin
    .from('check_results')
    .insert({
      dataset_id: dataset.id,
      checked_at: now.toISOString(),
      available: availability.available,
      latency_ms: availability.latency_ms,
      checksum,
      checksum_match: checksumMatch,
      row_count: rowCount,
      row_count_delta: rowCountDelta,
      schema_drift: schemaDrift,
      drift_details: driftDetails,
      status: checkStatus,
    })
    .select()
    .single()

  const newIncidents: Array<{ type: string; severity: string; description: string }> = []

  if (!availability.available) {
    const { data: existing } = await supabaseAdmin
      .from('incidents')
      .select('id')
      .eq('dataset_id', dataset.id)
      .eq('type', 'outage')
      .eq('resolved', false)
      .limit(1)
      .single()

    if (!existing) {
      newIncidents.push({
        type: 'outage',
        severity: 'critical',
        description: `Dataset is unavailable. ${availability.error ?? `HTTP ${availability.statusCode}`}`,
      })
    }
  } else {
    await supabaseAdmin
      .from('incidents')
      .update({ resolved: true, resolved_at: now.toISOString() })
      .eq('dataset_id', dataset.id)
      .eq('type', 'outage')
      .eq('resolved', false)
  }

  if (checksumMatch === false) {
    newIncidents.push({
      type: 'integrity_failure',
      severity: 'warning',
      description: 'Dataset checksum does not match the baseline. File content may have changed.',
    })
  }

  if (schemaDrift) {
    const details = driftDetails as { addedColumns?: string[]; removedColumns?: string[]; typeChanges?: unknown[] }
    if ((details.addedColumns?.length ?? 0) > 0 || (details.removedColumns?.length ?? 0) > 0 || (details.typeChanges?.length ?? 0) > 0) {
      newIncidents.push({
        type: 'schema_drift',
        severity: 'warning',
        description: `Schema drift detected. Added: ${details.addedColumns?.join(', ') ?? 'none'}. Removed: ${details.removedColumns?.join(', ') ?? 'none'}.`,
      })
    }

    const spikes = (driftDetails as { nullRateSpikes?: Array<{ column: string }> }).nullRateSpikes
    if (spikes && spikes.length > 0) {
      newIncidents.push({
        type: 'data_drift',
        severity: 'info',
        description: `Null rate spike detected in columns: ${spikes.map((s) => s.column).join(', ')}.`,
      })
    }
  }

  for (const inc of newIncidents) {
    const { data: incident } = await supabaseAdmin
      .from('incidents')
      .insert({
        dataset_id: dataset.id,
        severity: inc.severity,
        type: inc.type,
        description: inc.description,
      })
      .select()
      .single()

    if (dataset.alert_email || dataset.alert_webhook) {
      try {
        await sendAlert({
          dataset: { name: dataset.name, id: dataset.id },
          incident: inc,
          alertEmail: dataset.alert_email ?? undefined,
          alertWebhook: dataset.alert_webhook ?? undefined,
        })

        if (incident) {
          await supabaseAdmin.from('alert_logs').insert({
            dataset_id: dataset.id,
            channel: dataset.alert_email ? 'email' : 'webhook',
            incident_id: incident.id,
            success: true,
          })
        }
      } catch (err) {
        console.error('Alert delivery failed:', err)
        if (incident) {
          await supabaseAdmin.from('alert_logs').insert({
            dataset_id: dataset.id,
            channel: dataset.alert_email ? 'email' : 'webhook',
            incident_id: incident.id,
            success: false,
          })
        }
      }
    }
  }

  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [r24, r7d, r30d] = await Promise.all([
    supabaseAdmin.from('check_results').select('available, latency_ms').eq('dataset_id', dataset.id).gte('checked_at', since24h),
    supabaseAdmin.from('check_results').select('available').eq('dataset_id', dataset.id).gte('checked_at', since7d),
    supabaseAdmin.from('check_results').select('available, checksum_match').eq('dataset_id', dataset.id).gte('checked_at', since30d),
  ])

  const calc24 = r24.data ?? []
  const calc7d = r7d.data ?? []
  const calc30d = r30d.data ?? []

  const uptime24h = calc24.length > 0 ? (calc24.filter((r) => r.available).length / calc24.length) * 100 : 100
  const uptime7d = calc7d.length > 0 ? (calc7d.filter((r) => r.available).length / calc7d.length) * 100 : 100
  const uptime30d = calc30d.length > 0 ? (calc30d.filter((r) => r.available).length / calc30d.length) * 100 : 100

  const latencies = calc24.map((r) => r.latency_ms).filter((l) => l !== null) as number[]
  const avgLatencyMs = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

  const checksWithChecksum = calc30d.filter((r) => r.checksum_match !== null)
  const integrityPassRate = checksWithChecksum.length > 0
    ? (checksWithChecksum.filter((r) => r.checksum_match).length / checksWithChecksum.length) * 100
    : 100

  const { count: driftCount } = await supabaseAdmin
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('dataset_id', dataset.id)
    .in('type', ['schema_drift', 'data_drift'])
    .gte('started_at', since30d)

  const canaryScore = computeCanaryScore({
    uptime24h,
    uptime7d,
    integrityPassRate,
    driftEventCount: driftCount ?? 0,
    avgLatencyMs,
  })

  let newStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
  if (!availability.available) {
    newStatus = 'down'
  } else if (checkStatus === 'warn' || canaryScore < 80) {
    newStatus = 'degraded'
  }

  const { count: criticalCount30d } = await supabaseAdmin
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('dataset_id', dataset.id)
    .eq('severity', 'critical')
    .gte('started_at', since30d)

  const firstCheck = dataset.created_at
  const daysSinceCreation = (now.getTime() - new Date(firstCheck).getTime()) / (1000 * 60 * 60 * 24)
  const shouldCertify = daysSinceCreation >= 30 && canaryScore >= 95 && (criticalCount30d ?? 0) === 0

  await supabaseAdmin
    .from('monitored_datasets')
    .update({
      canary_score: canaryScore,
      uptime_24h: Math.round(uptime24h * 10) / 10,
      uptime_7d: Math.round(uptime7d * 10) / 10,
      uptime_30d: Math.round(uptime30d * 10) / 10,
      avg_latency_ms: Math.round(avgLatencyMs),
      status: newStatus,
      last_checked_at: now.toISOString(),
      ...(shouldCertify && !dataset.certified
        ? { certified: true, certified_at: now.toISOString() }
        : {}),
    })
    .eq('id', dataset.id)

  void checkResult
}
