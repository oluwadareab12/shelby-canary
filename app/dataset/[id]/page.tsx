import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/db/supabase'
import { StatusIndicator } from '@/components/StatusIndicator'
import { CanaryBadge } from '@/components/CanaryBadge'
import { IncidentTimeline } from '@/components/IncidentTimeline'
import { UptimeChart } from '@/components/UptimeChart'
import { LatencyChart } from '@/components/LatencyChart'
import { DriftHeatmap } from '@/components/DriftHeatmap'
import { MonitoredDataset, CheckResult, Incident } from '@/types'
import { CheckCircle, AlertTriangle, XCircle, Award } from 'lucide-react'

interface Props {
  params: { id: string }
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function statusLabel(status: string) {
  switch (status) {
    case 'healthy': return { label: 'HEALTHY', icon: CheckCircle, color: 'text-green-400 border-green-500/30 bg-green-500/10' }
    case 'degraded': return { label: 'DEGRADED', icon: AlertTriangle, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
    case 'down': return { label: 'DOWN', icon: XCircle, color: 'text-red-400 border-red-500/30 bg-red-500/10' }
    default: return { label: 'PENDING', icon: CheckCircle, color: 'text-gray-400 border-gray-500/30 bg-gray-500/10' }
  }
}

function buildUptimeChartData(checks: CheckResult[]) {
  const dayMap: Record<string, { total: number; available: number }> = {}
  for (const c of checks) {
    const day = c.checked_at.slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { total: 0, available: 0 }
    dayMap[day].total++
    if (c.available) dayMap[day].available++
  }
  return Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, { total, available }]) => ({
      date: date.slice(5),
      uptime: total > 0 ? Math.round((available / total) * 1000) / 10 : 100,
    }))
}

function buildLatencyChartData(checks: CheckResult[]) {
  return checks
    .filter((c) => c.latency_ms !== null)
    .slice(0, 48)
    .reverse()
    .map((c) => ({ timestamp: c.checked_at, latency_ms: c.latency_ms! }))
}

function buildDriftEvents(incidents: Incident[]) {
  return incidents
    .filter((i) => i.type === 'schema_drift' || i.type === 'data_drift')
    .flatMap((i) => {
      const details = (i as unknown as { drift_details?: { addedColumns?: string[]; removedColumns?: string[] } }).drift_details
      const columns = [
        ...(details?.addedColumns ?? []),
        ...(details?.removedColumns ?? []),
      ]
      if (columns.length === 0) return [{ column: 'unknown', date: i.started_at, type: i.type }]
      return columns.map((col) => ({ column: col, date: i.started_at, type: i.type }))
    })
}

async function getDatasetData(id: string) {
  const { data: dataset } = await supabaseAdmin
    .from('monitored_datasets')
    .select('*')
    .eq('id', id)
    .single()

  if (!dataset) return null

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: checks7d }, { data: checks24h }, { data: incidents }, { count: totalChecks }] =
    await Promise.all([
      supabaseAdmin
        .from('check_results')
        .select('*')
        .eq('dataset_id', id)
        .gte('checked_at', since7d)
        .order('checked_at', { ascending: false }),
      supabaseAdmin
        .from('check_results')
        .select('*')
        .eq('dataset_id', id)
        .gte('checked_at', since24h)
        .order('checked_at', { ascending: false }),
      supabaseAdmin
        .from('incidents')
        .select('*')
        .eq('dataset_id', id)
        .order('started_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('check_results')
        .select('id', { count: 'exact', head: true })
        .eq('dataset_id', id),
    ])

  return {
    dataset: dataset as MonitoredDataset,
    checks7d: (checks7d ?? []) as CheckResult[],
    checks24h: (checks24h ?? []) as CheckResult[],
    incidents: (incidents ?? []) as Incident[],
    totalChecks: totalChecks ?? 0,
  }
}

export default async function DatasetPage({ params }: Props) {
  const data = await getDatasetData(params.id)
  if (!data) notFound()

  const { dataset, checks7d, checks24h, incidents, totalChecks } = data
  const statusInfo = statusLabel(dataset.status)
  const StatusIcon = statusInfo.icon

  const uptimeData = buildUptimeChartData(checks7d)
  const latencyData = buildLatencyChartData(checks24h)
  const driftEvents = buildDriftEvents(incidents)
  const driftColumns = dataset.baseline_schema ? Object.keys(dataset.baseline_schema) : []

  const badgeSnippet = `<a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://canary.shelby.xyz'}/dataset/${dataset.id}" target="_blank">
  <img src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://canary.shelby.xyz'}/api/badge/${dataset.id}" alt="Shelby Canary" />
</a>`

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusIndicator status={dataset.status} size="lg" />
            <h1 className="text-2xl font-bold text-white">{dataset.name}</h1>
            {dataset.certified && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <Award className="w-3 h-3" /> Certified
              </span>
            )}
          </div>
          {dataset.description && (
            <p className="text-gray-400 text-sm mb-1">{dataset.description}</p>
          )}
          <p className="text-xs text-gray-600 font-mono">
            Owner: {dataset.owner_wallet.length > 20
              ? `${dataset.owner_wallet.slice(0, 10)}...${dataset.owner_wallet.slice(-6)}`
              : dataset.owner_wallet}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono font-bold ${statusInfo.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusInfo.label}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 flex flex-col items-center">
          <div className={`text-5xl font-mono font-bold ${scoreColor(dataset.canary_score)}`}>
            {dataset.canary_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Canary Score</div>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
          <div className="text-sm text-gray-500 mb-2">Uptime</div>
          <div className="flex gap-4">
            <div><div className="text-lg font-mono text-white">{dataset.uptime_24h.toFixed(1)}%</div><div className="text-xs text-gray-600">24h</div></div>
            <div><div className="text-lg font-mono text-white">{dataset.uptime_7d.toFixed(1)}%</div><div className="text-xs text-gray-600">7d</div></div>
            <div><div className="text-lg font-mono text-white">{dataset.uptime_30d.toFixed(1)}%</div><div className="text-xs text-gray-600">30d</div></div>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
          <div className="text-sm text-gray-500 mb-2">Performance</div>
          <div className="text-lg font-mono text-white">{Math.round(dataset.avg_latency_ms)}ms</div>
          <div className="text-xs text-gray-600">avg latency</div>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
          <div className="text-sm text-gray-500 mb-2">History</div>
          <div className="text-lg font-mono text-white">{totalChecks}</div>
          <div className="text-xs text-gray-600">total checks</div>
          <div className="text-xs text-gray-600 mt-1">{incidents.length} incidents</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Uptime — Last 7 Days</h2>
          <UptimeChart data={uptimeData} />
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Latency — Last 24 Hours</h2>
          <LatencyChart data={latencyData} />
        </div>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-4">Drift Heatmap — Last 14 Days</h2>
        <DriftHeatmap columns={driftColumns} events={driftEvents} />
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-4">Incident History</h2>
        <IncidentTimeline incidents={incidents} />
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Trust Badge</h2>
        <div className="flex items-center gap-4 mb-4">
          <CanaryBadge datasetId={dataset.id} score={dataset.canary_score} status={dataset.status} />
        </div>
        <pre className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-3 text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap">
          {badgeSnippet}
        </pre>
      </div>
    </main>
  )
}
