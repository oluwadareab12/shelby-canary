interface ScoreParams {
  uptime24h: number
  uptime7d: number
  integrityPassRate: number
  driftEventCount: number
  avgLatencyMs: number
}

export function computeCanaryScore(params: ScoreParams): number {
  const { uptime24h, uptime7d, integrityPassRate, driftEventCount, avgLatencyMs } = params

  let score = 100

  score -= (100 - uptime24h) * 0.4
  score -= (100 - uptime7d) * 0.3
  score -= (100 - integrityPassRate) * 0.2
  score -= Math.min(driftEventCount * 2, 10)

  if (avgLatencyMs >= 500) {
    const latencyPenalty = Math.min(((avgLatencyMs - 500) / 1500) * 5, 5)
    score -= latencyPenalty
  }

  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10
}
