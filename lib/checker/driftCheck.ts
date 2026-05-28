import { DriftCheckResult, ColumnStats } from '@/types'

interface CheckInput {
  schema: Record<string, string>
  stats: Record<string, ColumnStats>
  rowCount: number
}

export async function driftCheck(
  current: CheckInput,
  baseline: CheckInput
): Promise<DriftCheckResult> {
  const baselineCols = new Set(Object.keys(baseline.schema))
  const currentCols = new Set(Object.keys(current.schema))

  const addedColumns = [...currentCols].filter((c) => !baselineCols.has(c))
  const removedColumns = [...baselineCols].filter((c) => !currentCols.has(c))

  const typeChanges: Array<{ column: string; from: string; to: string }> = []
  for (const col of baselineCols) {
    if (currentCols.has(col) && baseline.schema[col] !== current.schema[col]) {
      typeChanges.push({
        column: col,
        from: baseline.schema[col],
        to: current.schema[col],
      })
    }
  }

  const nullRateSpikes: Array<{ column: string; baseline: number; current: number }> = []
  for (const col of baselineCols) {
    if (!currentCols.has(col)) continue
    const baselineNullRate = baseline.stats[col]?.nullRate ?? 0
    const currentNullRate = current.stats[col]?.nullRate ?? 0
    if (currentNullRate - baselineNullRate > 0.2) {
      nullRateSpikes.push({
        column: col,
        baseline: baselineNullRate,
        current: currentNullRate,
      })
    }
  }

  const rowCountDelta = current.rowCount - baseline.rowCount
  const rowCountDeltaPct =
    baseline.rowCount > 0 ? (rowCountDelta / baseline.rowCount) * 100 : 0

  const hasDrift =
    addedColumns.length > 0 ||
    removedColumns.length > 0 ||
    typeChanges.length > 0 ||
    nullRateSpikes.length > 0

  return {
    hasDrift,
    details: {
      addedColumns,
      removedColumns,
      typeChanges,
      nullRateSpikes,
      rowCountDelta,
      rowCountDeltaPct,
    },
  }
}
