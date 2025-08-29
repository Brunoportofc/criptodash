import { NextRequest, NextResponse } from "next/server"

// Cache em memória para ticker
type CacheKey = string
type CacheEntry = { timestamp: number; data: any }
const tickerCache = new Map<CacheKey, CacheEntry>()
const TICKER_TTL_MS = 500

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol parameter is required" },
        { status: 400 }
      )
    }

    const cacheKey = symbol.toUpperCase()
    const cached = tickerCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < TICKER_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data })
    }

    console.log(`🔄 Fetching ticker data for ${symbol} from MEXC API`)

    // Fazer requisição para API pública da MEXC
    const mexcResponse = await fetch(
      `https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'crypto-dashboard/1.0',
        },
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!mexcResponse.ok) {
      const errorText = await mexcResponse.text()
      console.error(`❌ MEXC API error for ${symbol}:`, mexcResponse.status, errorText)
      
      return NextResponse.json(
        { 
          success: false, 
          error: `MEXC API error: ${mexcResponse.status}`,
          details: errorText 
        },
        { status: mexcResponse.status }
      )
    }

    const mexcData = await mexcResponse.json()
    
    // Formatar dados para nosso padrão
    const formattedData = {
      symbol: symbol.toUpperCase(),
      price: mexcData.lastPrice,
      priceChange: mexcData.priceChange,
      priceChangePercent: mexcData.priceChangePercent,
      high: mexcData.highPrice,
      low: mexcData.lowPrice,
      volume: mexcData.volume,
      timestamp: Date.now()
    }

    console.log(`✅ Successfully fetched ticker for ${symbol}:`, {
      price: formattedData.price,
      change: formattedData.priceChangePercent + '%'
    })

    // Cachear
    tickerCache.set(cacheKey, { timestamp: Date.now(), data: formattedData })

    return NextResponse.json({
      success: true,
      data: formattedData
    })

  } catch (error: any) {
    console.error("❌ Error fetching ticker data:", error)
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500
    let errorMessage = "Failed to fetch ticker data"
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      statusCode = 408 // Request Timeout
      errorMessage = "Request timeout - MEXC API took too long to respond"
    } else if (error.message.includes('fetch')) {
      statusCode = 503 // Service Unavailable
      errorMessage = "MEXC API is temporarily unavailable"
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}
