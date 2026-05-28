export type FileFormat = 'csv' | 'json'
export type DatasetStatus = 'healthy' | 'degraded' | 'down' | 'pending'
export type CheckStatus = 'pass' | 'warn' | 'fail'
export type Severity = 'info' | 'warning' | 'critical'
export type AlertChannel = 'email' | 'webhook'

export interface MonitoredDataset {
  id: string
  name: string
  description: string | null
  dataset_url: string
  owner_wallet: string
  file_format: FileFormat
  check_interval_minutes: number
  alert_email: string | null
  alert_webhook: string | null
  baseline_checksum: string | null
  baseline_row_count: number | null
  baseline_schema: Record<string, string>
  baseline_stats: Record<string, ColumnStats>
  canary_score: number
  uptime_24h: number
  uptime_7d: number
  uptime_30d: number
  avg_latency_ms: number
  status: DatasetStatus
  certified: boolean
  certified_at: string | null
  last_checked_at: string | null
  created_at: string
}

export interface ColumnStats {
  nullRate: number
  min?: number
  max?: number
  uniqueCount: number
}

export interface CheckResult {
  id: string
  dataset_id: string
  checked_at: string
  available: boolean
  latency_ms: number | null
  checksum: string | null
  checksum_match: boolean | null
  row_count: number | null
  row_count_delta: number | null
  schema_drift: boolean
  drift_details: Record<string, unknown>
  status: CheckStatus
}

export interface Incident {
  id: string
  dataset_id: string
  started_at: string
  resolved_at: string | null
  severity: Severity
  type: string
  description: string
  resolved: boolean
}

export interface AlertLog {
  id: string
  dataset_id: string
  sent_at: string
  channel: AlertChannel
  incident_id: string | null
  success: boolean
}

export interface IntegrityCheckResult {
  checksum: string
  rowCount: number
  schema: Record<string, string>
  stats: Record<string, ColumnStats>
}

export interface DriftDetails {
  addedColumns: string[]
  removedColumns: string[]
  typeChanges: Array<{ column: string; from: string; to: string }>
  nullRateSpikes: Array<{ column: string; baseline: number; current: number }>
  rowCountDelta: number
  rowCountDeltaPct: number
}

export interface DriftCheckResult {
  hasDrift: boolean
  details: DriftDetails
}

export interface AvailabilityCheckResult {
  available: boolean
  latency_ms: number
  statusCode: number | null
  error: string | null
}

export interface LeaderboardEntry {
  id: string
  name: string
  owner_wallet: string
  canary_score: number
  uptime_24h: number
  certified: boolean
  status: DatasetStatus
  total_checks: number
}

export interface RegisterDatasetBody {
  name: string
  description?: string
  dataset_url: string
  owner_wallet: string
  file_format: FileFormat
  check_interval_minutes: 15 | 30 | 60
  alert_email?: string
  alert_webhook?: string
}
