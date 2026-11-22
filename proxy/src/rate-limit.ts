export type RateLimitResult = { allowed: boolean; retryAfter: number }

type Bucket = { count: number; windowStartedAt: number }

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly limit = 20, private readonly windowMs = 60_000) {}

  check(identifier: string, now = Date.now()): RateLimitResult {
    const current = this.buckets.get(identifier)
    if (!current || now - current.windowStartedAt >= this.windowMs) {
      this.buckets.set(identifier, { count: 1, windowStartedAt: now })
      return { allowed: true, retryAfter: 0 }
    }
    if (current.count >= this.limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((this.windowMs - (now - current.windowStartedAt)) / 1000)) }
    }
    current.count += 1
    return { allowed: true, retryAfter: 0 }
  }
}
