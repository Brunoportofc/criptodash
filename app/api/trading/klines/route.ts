import { NextRequest, NextResponse } from "next/server"

// Cache simples em memória para aliviar rate limit
type CacheKey = string
type CacheEntry = { timestamp: number; data: any }
const klinesCache = new Map<CacheKey, CacheEntry>()
const KLINES_TTL_MS = 5000 // 5s

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const interval = searchParams.get('interval') || '1m'
    const limit = searchParams.get('limit') || '100'
    
    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol parameter is required" },
        { status: 400 }
      )
    }

    const limitNum = Math.min(parseInt(limit), 500) // Máximo 500 klines

    const cacheKey = `${symbol}:${interval}:${limitNum}`
    const cached = klinesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < KLINES_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data })
    }

    console.log(`🔄 Fetching ${limitNum} klines (${interval}) for ${symbol} from MEXC API`)

    // Fazer requisição para API pública da MEXC
    const mexcResponse = await fetch(
      `https://api.mexc.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limitNum}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'crypto-dashboard/1.0',
        },
        // Timeout de 15 segundos para klines (pode ser mais dados)
        signal: AbortSignal.timeout(15000),
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
    const formattedKlines = mexcData.map((kline: any[]) => ({
      symbol: symbol.toUpperCase(),
      interval,
      openTime: kline[0],
      closeTime: kline[6],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      trades: kline[8]
    }))

    console.log(`✅ Successfully fetched ${formattedKlines.length} klines for ${symbol}`)

    // Armazenar em cache
    klinesCache.set(cacheKey, { timestamp: Date.now(), data: formattedKlines })

    return NextResponse.json({
      success: true,
      data: formattedKlines
    })

  } catch (error: any) {
    console.error("❌ Error fetching klines data:", error)
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500
    let errorMessage = "Failed to fetch klines data"
    
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
