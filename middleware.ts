import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimit, getRateLimitKey } from "./lib/rate-limiter"

export function middleware(request: NextRequest) {
  // Rate limiting
  const rateLimitKey = getRateLimitKey(request)
  const rateLimitResult = rateLimit(rateLimitKey, 100, 60 * 1000)

  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  // CORS headers
  const response = NextResponse.next()
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())

  return response
}

export const config = {
  matcher: "/api/:path*",
}
