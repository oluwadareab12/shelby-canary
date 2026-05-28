import crypto from 'crypto'
import Papa from 'papaparse'
import { IntegrityCheckResult, ColumnStats } from '@/types'

function inferType(values: unknown[]): string {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '')
  if (nonNull.length === 0) return 'string'

  const allBoolean = nonNull.every(
    (v) => v === true || v === false || v === 'true' || v === 'false'
  )
  if (allBoolean) return 'boolean'

  const allNumber = nonNull.every((v) => !isNaN(Number(v)))
  if (allNumber) return 'number'

  const allDate = nonNull.every((v) => !isNaN(Date.parse(String(v))))
  if (allDate) return 'date'

  return 'string'
}

function computeColumnStats(values: unknown[]): ColumnStats {
  const total = values.length
  const nullCount = values.filter((v) => v === null || v === undefined || v === '').length
  const nullRate = total > 0 ? nullCount / total : 0

  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '')
  const uniqueCount = new Set(nonNull.map(String)).size

  const numbers = nonNull.map(Number).filter((n) => !isNaN(n))
  if (numbers.length > 0) {
    return {
      nullRate,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      uniqueCount,
    }
  }

  return { nullRate, uniqueCount }
}

export async function integrityCheck(
  url: string,
  format: 'csv' | 'json'
): Promise<IntegrityCheckResult> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: HTTP ${response.status}`)
  }

  const rawBody = await response.text()
  const checksum = crypto.createHash('sha256').update(rawBody).digest('hex')

  let rows: Record<string, unknown>[] = []

  if (format === 'csv') {
    const result = Papa.parse<Record<string, unknown>>(rawBody, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    })
    rows = result.data
  } else {
    const parsed = JSON.parse(rawBody)
    rows = Array.isArray(parsed) ? parsed : [parsed]
  }

  const rowCount = rows.length

  if (rowCount === 0) {
    return { checksum, rowCount: 0, schema: {}, stats: {} }
  }

  const columns = Object.keys(rows[0])
  const schema: Record<string, string> = {}
  const stats: Record<string, ColumnStats> = {}

  for (const col of columns) {
    const values = rows.map((r) => r[col])
    schema[col] = inferType(values)
    stats[col] = computeColumnStats(values)
  }

  return { checksum, rowCount, schema, stats }
}
