// AC6: Rate limiting in-memory — 5 tentativas por IP em 15 minutos
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_ATTEMPTS = 5

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

export function resetRateLimit(ip: string): void {
  store.delete(ip)
}
