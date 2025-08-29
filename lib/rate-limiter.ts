import type { NextRequest } from "next/server"

interface RateLimitStore {
  [key: string]: {
    requests: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(
  key: string,
  limit = 100,
  window: number = 60 * 1000, // 1 minute
) {
  const now = Date.now()
  const record = store[key]

  if (!record || now > record.resetTime) {
    store[key] = {
      requests: 1,
      resetTime: now + window,
    }
    return { success: true, remaining: limit - 1 }
  }

  if (record.requests >= limit) {
    return { success: false, remaining: 0 }
  }

  record.requests++
  return { success: true, remaining: limit - record.requests }
}

export function getRateLimitKey(req: NextRequest, identifier?: string): string {
  const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown"
  return identifier ? `${identifier}:${ip}` : ip
}
