import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/supabase'
import { availabilityCheck } from '@/lib/checker/availabilityCheck'
import { integrityCheck } from '@/lib/checker/integrityCheck'
import { RegisterDatasetBody } from '@/types'

export async function POST(req: NextRequest) {
  let body: RegisterDatasetBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, description, dataset_url, owner_wallet, file_format, check_interval_minutes, alert_email, alert_webhook } = body

  if (!name || !dataset_url || !owner_wallet || !file_format || !check_interval_minutes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['csv', 'json'].includes(file_format)) {
    return NextResponse.json({ error: 'file_format must be csv or json' }, { status: 400 })
  }

  if (![15, 30, 60].includes(check_interval_minutes)) {
    return NextResponse.json({ error: 'check_interval_minutes must be 15, 30, or 60' }, { status: 400 })
  }

  const availability = await availabilityCheck(dataset_url)

  let baselineChecksum: string | null = null
  let baselineRowCount: number | null = null
  let baselineSchema: Record<string, string> = {}
  let baselineStats: Record<string, unknown> = {}
  let checkStatus: 'pass' | 'warn' | 'fail' = availability.available ? 'pass' : 'fail'

  if (availability.available) {
    try {
      const integrity = await integrityCheck(dataset_url, file_format)
      baselineChecksum = integrity.checksum
      baselineRowCount = integrity.rowCount
      baselineSchema = integrity.schema
      baselineStats = integrity.stats
    } catch (err) {
      console.error('Integrity check failed during registration:', err)
      checkStatus = 'warn'
    }
  }

  const { data: dataset, error: insertError } = await supabaseAdmin
    .from('monitored_datasets')
    .insert({
      name,
      description: description ?? null,
      dataset_url,
      owner_wallet,
      file_format,
      check_interval_minutes,
      alert_email: alert_email ?? null,
      alert_webhook: alert_webhook ?? null,
      baseline_checksum: baselineChecksum,
      baseline_row_count: baselineRowCount,
      baseline_schema: baselineSchema,
      baseline_stats: baselineStats,
      canary_score: availability.available ? 100 : 0,
      status: availability.available ? 'healthy' : 'down',
      last_checked_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError || !dataset) {
    console.error('Failed to insert dataset:', insertError)
    return NextResponse.json({ error: 'Failed to register dataset' }, { status: 500 })
  }

  await supabaseAdmin.from('check_results').insert({
    dataset_id: dataset.id,
    available: availability.available,
    latency_ms: availability.latency_ms,
    checksum: baselineChecksum,
    checksum_match: true,
    row_count: baselineRowCount,
    row_count_delta: 0,
    schema_drift: false,
    drift_details: {},
    status: checkStatus,
  })

  return NextResponse.json(dataset, { status: 201 })
}
