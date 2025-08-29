"use client"

import { useEffect, useRef, useState } from "react"

export function useTickerSSE(symbol: string) {
  const [data, setData] = useState<any | null>(null)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!symbol) return

    const url = `/api/stream/ticker?symbol=${encodeURIComponent(symbol)}`
    console.log(`🔌 Connecting to ticker stream:`, url)
    
    const es = new EventSource(url)
    esRef.current = es
    
    es.onopen = () => {
      console.log(`✅ Ticker stream connected for ${symbol}`)
      setConnected(true)
    }
    
    es.onerror = (err) => {
      console.error(`❌ Ticker stream error for ${symbol}:`, err)
      setConnected(false)
    }
    
    es.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data)
        if (parsed?.type === "ticker") {
          console.log(`📈 Received ticker data for ${symbol}:`, parsed.data)
          setData(parsed.data)
        }
      } catch (e) {
        console.error(`❌ Failed to parse ticker message:`, e)
      }
    }
    
    return () => {
      console.log(`🔌 Closing ticker stream for ${symbol}`)
      es.close()
    }
  }, [symbol])

  return { data, connected }
}


