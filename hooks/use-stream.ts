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
      console.error(`❌ Ticker stream error for ${symbol}:`, {
        readyState: es.readyState,
        url: es.url,
        error: err
      })
      setConnected(false)
      
      // Tentar reconectar após 5 segundos em caso de erro
      setTimeout(() => {
        if (esRef.current === es) {
          console.log(`🔄 Attempting to reconnect ticker stream for ${symbol}`)
          es.close()
          // O useEffect será executado novamente devido à mudança de dependência
        }
      }, 5000)
    }
    
    es.onmessage = (evt) => {
      try {
        // Ignorar mensagens de heartbeat
        if (evt.data.trim() === '' || evt.data.startsWith(': ping')) {
          return
        }
        
        const parsed = JSON.parse(evt.data)
        if (parsed?.type === "ticker" && parsed?.data) {
          console.log(`📈 Received ticker data for ${symbol}:`, {
            price: parsed.data.price,
            change: parsed.data.priceChangePercent
          })
          setData(parsed.data)
        } else {
          console.warn(`⚠️ Unexpected ticker message format for ${symbol}:`, parsed)
        }
      } catch (e) {
        console.error(`❌ Failed to parse ticker message for ${symbol}:`, {
          data: evt.data,
          error: e
        })
      }
    }
    
    return () => {
      console.log(`🔌 Closing ticker stream for ${symbol}`)
      es.close()
    }
  }, [symbol])

  return { data, connected }
}


