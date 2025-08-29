import { NextRequest, NextResponse } from "next/server"

// Cache simples para trades
type CacheKey = string
type CacheEntry = { timestamp: number; data: any }
const tradesCache = new Map<CacheKey, CacheEntry>()
const TRADES_TTL_MS = 2000

// Função auxiliar para retry
async function fetchWithRetry(url: string, options: any, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      console.log(`🔄 Attempt ${i + 1}/${maxRetries + 1} for ${url}`)
      const response = await fetch(url, options)
      return response
    } catch (error: any) {
      lastError = error
      console.warn(`⚠️ Attempt ${i + 1} failed:`, error.message)
      
      // Se não é o último retry, aguardar um pouco
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // 1s, 2s, 3s...
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const limit = searchParams.get('limit') || '50'
    
    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol parameter is required" },
        { status: 400 }
      )
    }

    // Validar limit
    const limitInput = parseInt(limit)
    if (isNaN(limitInput) || limitInput <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid limit parameter" },
        { status: 400 }
      )
    }

    const limitNum = Math.min(limitInput, 100) // Máximo 100 trades

    const cacheKey = `${symbol.toUpperCase()}:${limitNum}`
    const cached = tradesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < TRADES_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data })
    }

    console.log(`🔄 Fetching ${limitNum} trades for ${symbol} from MEXC API`)

    // Fazer requisição para API pública da MEXC com retry
    const mexcResponse = await fetchWithRetry(
      `https://api.mexc.com/api/v3/trades?symbol=${symbol.toUpperCase()}&limit=${limitNum}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'crypto-dashboard/1.0',
        },
        // Timeout de 8 segundos (mais conservador)
        signal: AbortSignal.timeout(8000),
      },
      2 // Máximo 2 retries
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
    const formattedTrades = mexcData.map((trade: any, index: number) => ({
      symbol: symbol.toUpperCase(),
      price: trade.price,
      quantity: trade.qty,
      side: trade.isBuyerMaker ? "SELL" : "BUY",
      timestamp: trade.time,
      id: trade.id ? trade.id.toString() : `${trade.time}-${index}`
    }))

    console.log(`✅ Successfully fetched ${formattedTrades.length} trades for ${symbol}`)

    // Cachear
    tradesCache.set(cacheKey, { timestamp: Date.now(), data: formattedTrades })

    return NextResponse.json({
      success: true,
      data: formattedTrades
    })

  } catch (error: any) {
    console.error("❌ Error fetching trades data:", error)
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500
    let errorMessage = "Failed to fetch trades data"
    
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
