import { useState, useEffect } from "react"

export interface OrderBookData {
  symbol: string
  bids: Array<[string, string]>
  asks: Array<[string, string]>
  timestamp: number
}

export interface TickerData {
  symbol: string
  price: string
  priceChange: string
  priceChangePercent: string
  high: string
  low: string
  volume: string
  timestamp: number
}

export interface TradeData {
  symbol: string
  price: string
  quantity: string
  side: "BUY" | "SELL"
  timestamp: number
  id: string
}

export interface KlineData {
  symbol: string
  interval: string
  openTime: number
  closeTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  trades: number
}

// Mapeamento de símbolos para correção automática
const SYMBOL_CORRECTIONS: Record<string, string> = {
  'USDTBRL': 'BRLUSDT',
  'BRLBTC': 'BTCBRL',
  'BRLETH': 'ETHBRL',
  'BRLSOL': 'SOLBRL',
  'BRLXRP': 'XRPBRL',
  'BRLMX': 'MXBRL',
  'BRLUSDC': 'USDCBRL',
  'BRLVINE': 'VINEBRL',
}

function getSimilarSymbols(symbol: string): string[] {
  const suggestions: string[] = []
  const upperSymbol = symbol.toUpperCase()
  
  // Sugestões baseadas em padrões comuns
  if (upperSymbol.includes('BRL')) {
    suggestions.push('BRLUSDT', 'BTCBRL', 'ETHBRL', 'SOLBRL')
  } else if (upperSymbol.includes('USDT')) {
    suggestions.push('BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT')
  } else {
    suggestions.push('BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BRLUSDT')
  }
  
  return [...new Set(suggestions)].slice(0, 4) // Remover duplicatas e limitar a 4
}

/**
 * Hook para dados de Order Book em tempo real via API REST
 */
export function useOrderBook(symbol: string) {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [isStale, setIsStale] = useState<boolean>(false)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [actualSymbol, setActualSymbol] = useState<string>(symbol)

  useEffect(() => {
    // Aplicar correção de símbolo
    const correctedSymbol = SYMBOL_CORRECTIONS[symbol.toUpperCase()] || symbol.toUpperCase()
    setActualSymbol(correctedSymbol)
    
    if (correctedSymbol !== symbol.toUpperCase()) {
      console.log(`🔄 Symbol corrected: ${symbol} → ${correctedSymbol}`)
    }
    
    console.log(`🔄 Setting up REAL orderbook data for ${correctedSymbol}`)

    // Função para buscar dados reais via API do backend
    const fetchRealOrderBook = async () => {
      try {
        setIsConnecting(true)
        console.log(`🌐 Fetching REAL orderbook data for ${correctedSymbol} via backend API`)
        
        const response = await fetch(`/api/trading/orderbook?symbol=${correctedSymbol}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          const formattedData: OrderBookData = {
            symbol: correctedSymbol,
            bids: result.data.bids.map((bid: any) => [bid.price, bid.quantity]),
            asks: result.data.asks.map((ask: any) => [ask.price, ask.quantity]),
            timestamp: new Date(result.data.timestamp).getTime()
          }
          
          console.log(`✅ Successfully fetched REAL orderbook data for ${correctedSymbol}:`, {
            bidsCount: formattedData.bids.length,
            asksCount: formattedData.asks.length,
            bestBid: formattedData.bids[0]?.[0],
            bestAsk: formattedData.asks[0]?.[0]
          })
          
          setOrderBook(formattedData)
          setLastUpdate(Date.now())
          setIsStale(false)
        } else {
          throw new Error(result.error || 'Failed to fetch orderbook data')
        }
      } catch (error) {
        console.error(`❌ Failed to fetch REAL orderbook data:`, error)
        setIsStale(true)
      } finally {
        setIsConnecting(false)
      }
    }

    // Buscar dados iniciais imediatamente
    fetchRealOrderBook()

    // Atualizar dados a cada 3 segundos para dados em tempo real
    const updateInterval = setInterval(() => {
      fetchRealOrderBook()
    }, 3000)

    // Marcar dados como obsoletos após 10 segundos sem atualizações
    const staleInterval = setInterval(() => {
      if (lastUpdate && Date.now() - lastUpdate > 10000) {
        console.log(`⚠️ Orderbook data is stale for ${correctedSymbol}`)
        setIsStale(true)
      }
    }, 5000)

    return () => {
      console.log(`🧹 Cleaning up REAL orderbook data for ${correctedSymbol}`)
      clearInterval(updateInterval)
      clearInterval(staleInterval)
    }
  }, [symbol])

  return { orderBook, isStale, lastUpdate, isConnecting, actualSymbol }
}

/**
 * Hook para dados de Ticker em tempo real via API REST
 */
export function useTicker(symbol: string, refreshMs: number = 5000) {
  const [ticker, setTicker] = useState<TickerData | null>(null)
  const [priceChange, setPriceChange] = useState<"up" | "down" | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  useEffect(() => {
    const correctedSymbol = SYMBOL_CORRECTIONS[symbol.toUpperCase()] || symbol.toUpperCase()
    console.log(`🔄 Setting up REAL ticker data for ${correctedSymbol}`)

    let isCancelled = false
    let delay = Math.max(500, refreshMs)
    const baseDelay = delay

    const fetchRealTicker = async () => {
      try {
        setIsConnecting(true)
        
        // Usar endpoint do backend para evitar CORS
        const response = await fetch(`/api/trading/ticker?symbol=${correctedSymbol}`)
        
        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch ticker data')
        }

        const newTicker: TickerData = {
          symbol: correctedSymbol,
          price: result.data.price,
          priceChange: result.data.priceChange,
          priceChangePercent: result.data.priceChangePercent,
          high: result.data.high,
          low: result.data.low,
          volume: result.data.volume,
          timestamp: result.data.timestamp
        }

        // Detectar mudança de preço
        if (ticker && ticker.price !== newTicker.price) {
          setPriceChange(parseFloat(newTicker.price) > parseFloat(ticker.price) ? "up" : "down")
          setTimeout(() => setPriceChange(null), 2000)
        }

        setTicker(newTicker)
        setLastUpdate(Date.now())
        console.log(`✅ Updated ticker for ${correctedSymbol}: ${newTicker.price}`)

        // resetar delay após sucesso
        delay = baseDelay
      } catch (error) {
        const message = (error as any)?.message || ''
        if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
          // backoff exponencial até 10s
          delay = Math.min(delay * 2, 10000)
          console.warn(`⏳ Ticker rate limited, backing off to ${delay}ms`)
        } else {
          console.error(`❌ Failed to fetch ticker data:`, error)
        }
      } finally {
        setIsConnecting(false)
      }
    }

    const loop = async () => {
      if (isCancelled) return
      await fetchRealTicker()
      if (isCancelled) return
      setTimeout(loop, delay)
    }

    loop()

    return () => {
      isCancelled = true
    }
  }, [symbol, refreshMs])

  return { ticker, priceChange, lastUpdate, isConnecting }
}

/**
 * Hook para dados de Trades em tempo real via API REST
 */
export function useTrades(symbol: string, maxTrades = 50, refreshMs: number = 4000) {
  const [trades, setTrades] = useState<TradeData[]>([])
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  useEffect(() => {
    const correctedSymbol = SYMBOL_CORRECTIONS[symbol.toUpperCase()] || symbol.toUpperCase()
    console.log(`🔄 Setting up REAL trades data for ${correctedSymbol}`)

    const fetchRealTrades = async () => {
      try {
        setIsConnecting(true)
        
        // Usar endpoint do backend para evitar CORS
        const response = await fetch(`/api/trading/trades?symbol=${correctedSymbol}&limit=${maxTrades}`, {
          signal: AbortSignal.timeout(12000), // 12s timeout no frontend
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `HTTP ${response.status}`
          
          if (response.status === 408) {
            console.warn(`⏰ Trades request timeout for ${correctedSymbol}`)
            return // Não atualizar dados em caso de timeout, manter os anteriores
          } else if (response.status === 503) {
            console.warn(`🔧 MEXC API temporarily unavailable for ${correctedSymbol}`)
            return
          }
          
          throw new Error(`Backend API error: ${errorMessage}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch trades data')
        }

        const newTrades: TradeData[] = result.data.slice(0, maxTrades)

        setTrades(newTrades)
        setLastUpdate(Date.now())
        console.log(`✅ Updated trades for ${correctedSymbol}: ${newTrades.length} trades`)
      } catch (error: any) {
        // Não logar como erro se for timeout ou indisponibilidade temporária
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          console.warn(`⏰ Trades fetch timeout for ${correctedSymbol}`)
        } else {
          console.error(`❌ Failed to fetch trades data for ${correctedSymbol}:`, error.message)
        }
      } finally {
        setIsConnecting(false)
      }
    }

    fetchRealTrades()
    const interval = setInterval(fetchRealTrades, Math.max(250, refreshMs)) // Atualizar conforme solicitado (mín 250ms)

    return () => {
      clearInterval(interval)
    }
  }, [symbol, maxTrades, refreshMs])

  return { trades, lastUpdate, isConnecting }
}

/**
 * Hook para dados de Kline/Candlestick em tempo real via API REST
 */
export function useKline(symbol: string, interval = "1m", refreshMs?: number) {
  const [klines, setKlines] = useState<KlineData[]>([])
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  useEffect(() => {
    const correctedSymbol = SYMBOL_CORRECTIONS[symbol.toUpperCase()] || symbol.toUpperCase()
    console.log(`🔄 Setting up REAL kline data for ${correctedSymbol}`)

    let isCancelled = false
    const defaultInterval = interval === "1m" ? 60000 : 300000
    let delay = Math.max(1000, refreshMs ?? defaultInterval)
    const baseDelay = delay

    const fetchRealKlines = async () => {
      try {
        setIsConnecting(true)
        
        // Usar endpoint do backend para evitar CORS
        const response = await fetch(`/api/trading/klines?symbol=${correctedSymbol}&interval=${interval}&limit=100`)
        
        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch klines data')
        }

        const newKlines: KlineData[] = result.data

        setKlines(newKlines)
        setLastUpdate(Date.now())
        console.log(`✅ Updated klines for ${correctedSymbol}: ${newKlines.length} candles`)

        delay = baseDelay
      } catch (error) {
        const message = (error as any)?.message || ''
        if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
          delay = Math.min(delay * 2, 60000)
          console.warn(`⏳ Klines rate limited, backing off to ${delay}ms`)
        } else {
          console.error(`❌ Failed to fetch kline data:`, error)
        }
      } finally {
        setIsConnecting(false)
      }
    }

    const loop = async () => {
      if (isCancelled) return
      await fetchRealKlines()
      if (isCancelled) return
      setTimeout(loop, delay)
    }

    loop()

    return () => {
      isCancelled = true
    }
  }, [symbol, interval, refreshMs])

  return { klines, lastUpdate, isConnecting }
}
