import { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")
  if (!symbol) {
    return new Response(JSON.stringify({ success: false, error: "Symbol parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const encoder = new TextEncoder()

      const send = (event: any) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Pull from our cached REST endpoint (which tem TTL curto)
      const tick = async () => {
        try {
          const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : (process.env.NEXT_PUBLIC_BASE_URL || "")
          const res = await fetch(`${baseUrl}/api/trading/ticker?symbol=${symbol}`, {
            cache: "no-store",
          })
          const json = await res.json().catch(() => ({}))
          if (json?.success && json?.data) {
            console.log(`📡 Streaming ticker for ${symbol}:`, json.data.price)
            send({ type: "ticker", data: json.data })
          }
        } catch (e) {
          console.error(`❌ Stream ticker error for ${symbol}:`, e)
        }
      }

      const interval = setInterval(tick, 500)
      tick()

      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`))
      }, 15000)

      return () => {
        closed = true
        clearInterval(interval)
        clearInterval(heartbeat)
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}


