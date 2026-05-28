import { AvailabilityCheckResult } from '@/types'

export async function availabilityCheck(url: string): Promise<AvailabilityCheckResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  const start = Date.now()

  try {
    const response = await fetch(url, { signal: controller.signal })
    const latency_ms = Date.now() - start
    clearTimeout(timeout)

    return {
      available: response.status >= 200 && response.status < 300,
      latency_ms,
      statusCode: response.status,
      error: null,
    }
  } catch (err: unknown) {
    clearTimeout(timeout)
    const latency_ms = Date.now() - start
    const error = err instanceof Error ? err.message : 'Unknown error'

    return {
      available: false,
      latency_ms,
      statusCode: null,
      error,
    }
  }
}
