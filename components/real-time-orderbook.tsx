"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, AlertCircle, RefreshCw } from "lucide-react"
import { useOrderBook } from "@/hooks/use-mexc-websocket"
import { cn } from "@/lib/utils"

interface RealTimeOrderBookProps {
  symbol: string
  onPriceSelect?: (price: string) => void
  className?: string
}

export function RealTimeOrderBook({ symbol, onPriceSelect, className }: RealTimeOrderBookProps) {
  console.log(`🔍 RealTimeOrderBook rendering for symbol: ${symbol}`)
  const { orderBook, isStale, lastUpdate, isConnecting, actualSymbol } = useOrderBook(symbol)
  console.log(`📊 OrderBook state:`, { orderBook, isStale, lastUpdate, isConnecting, actualSymbol })
  
  const symbolWasCorrected = actualSymbol !== symbol.toUpperCase()

  const processedData = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [], spread: 0, spreadPercent: 0 }

    const bids = orderBook.bids
      .slice(0, 15)
      .map(([price, quantity]) => ({
        price: Number.parseFloat(price),
        quantity: Number.parseFloat(quantity),
        total: Number.parseFloat(price) * Number.parseFloat(quantity),
      }))
      .sort((a, b) => b.price - a.price)

    const asks = orderBook.asks
      .slice(0, 15)
      .map(([price, quantity]) => ({
        price: Number.parseFloat(price),
        quantity: Number.parseFloat(quantity),
        total: Number.parseFloat(price) * Number.parseFloat(quantity),
      }))
      .sort((a, b) => a.price - b.price)

    const bestBid = bids[0]?.price || 0
    const bestAsk = asks[0]?.price || 0
    const spread = bestAsk - bestBid
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0

    // Calculate max quantities for depth visualization
    const maxBidQuantity = Math.max(...bids.map((b) => b.quantity), 0)
    const maxAskQuantity = Math.max(...asks.map((a) => a.quantity), 0)
    const maxQuantity = Math.max(maxBidQuantity, maxAskQuantity)

    return {
      bids: bids.map((bid) => ({ ...bid, depthPercent: (bid.quantity / maxQuantity) * 100 })),
      asks: asks.map((ask) => ({ ...ask, depthPercent: (ask.quantity / maxQuantity) * 100 })),
      spread,
      spreadPercent,
    }
  }, [orderBook])

  const formatPrice = (price: number) => {
    return price.toFixed(5)
  }

  const formatQuantity = (quantity: number) => {
    return quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const formatTotal = (total: number) => {
    return total.toFixed(2)
  }

  return (
    <Card className={cn("bg-slate-900 border-slate-700", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-slate-100 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
            Livro de Ofertas - {actualSymbol || symbol.toUpperCase()}
            {symbolWasCorrected && (
              <Badge variant="outline" className="ml-2 border-blue-500 text-blue-400 bg-blue-500/10 text-xs">
                Corrigido de {symbol.toUpperCase()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              Dados Reais MEXC
            </Badge>
            {isStale && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-400 bg-yellow-500/10">
                <AlertCircle className="w-4 h-4 mr-1" />
                Dados Desatualizados
              </Badge>
            )}
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              <RefreshCw className="w-4 h-4 mr-1" />
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Sem dados"}
            </Badge>
          </div>
        </div>

        {processedData.spread > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              Spread: <span className="text-slate-200 font-mono">{formatPrice(processedData.spread)}</span>
            </span>
            <span className="text-slate-400">({processedData.spreadPercent.toFixed(3)}%)</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {!orderBook ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
              <p className="text-slate-400">
                {isConnecting ? 'Carregando dados reais da MEXC...' : 'Aguardando dados reais...'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Buscando dados reais via API da MEXC
              </p>
              {symbolWasCorrected && (
                <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/50 rounded text-xs text-blue-300">
                  ✅ Símbolo corrigido: {symbol.toUpperCase()} → {actualSymbol}
                </div>
              )}
            </div>
          </div>
        ) : processedData.bids.length === 0 && processedData.asks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-slate-400">Nenhum dado disponível</p>
              <p className="text-xs text-slate-500 mt-1">
                Símbolo: {symbol} | Última atualização: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Nunca'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-700">
              <div className="text-left">
                Preço ({(actualSymbol || symbol).includes('BRL') ? 'BRL' : 'USDT'})
              </div>
              <div className="text-right">
                Quantidade ({(actualSymbol || symbol).split('USDT')[0] || (actualSymbol || symbol).split('BRL')[0]})
              </div>
              <div className="text-right">
                Total ({(actualSymbol || symbol).includes('BRL') ? 'BRL' : 'USDT'})
              </div>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="space-y-0.5">
              {processedData.asks.reverse().map((ask, index) => (
                <div
                  key={`ask-${index}`}
                  className="relative grid grid-cols-3 gap-4 px-4 py-1.5 text-sm hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  onClick={() => onPriceSelect?.(ask.price.toString())}
                >
                  {/* Depth bar */}
                  <div
                    className="absolute right-0 top-0 h-full bg-red-500/10 transition-all duration-300"
                    style={{ width: `${ask.depthPercent}%` }}
                  />

                  <div className="text-red-400 font-mono relative z-10 group-hover:text-red-300">
                    {formatPrice(ask.price)}
                  </div>
                  <div className="text-slate-300 font-mono text-right relative z-10">
                    {formatQuantity(ask.quantity)}
                  </div>
                  <div className="text-slate-400 font-mono text-right relative z-10">{formatTotal(ask.total)}</div>
                </div>
              ))}
            </div>

            {/* Spread indicator */}
            {processedData.spread > 0 && (
              <div className="flex items-center justify-center py-3 border-y border-slate-700 bg-slate-800/30">
                <div className="text-center">
                  <div className="text-xs text-slate-500">Spread</div>
                  <div className="text-sm font-mono text-slate-300">
                    {formatPrice(processedData.spread)} ({processedData.spreadPercent.toFixed(3)}%)
                  </div>
                </div>
              </div>
            )}

            {/* Bids (Buy Orders) */}
            <div className="space-y-0.5">
              {processedData.bids.map((bid, index) => (
                <div
                  key={`bid-${index}`}
                  className="relative grid grid-cols-3 gap-4 px-4 py-1.5 text-sm hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  onClick={() => onPriceSelect?.(bid.price.toString())}
                >
                  {/* Depth bar */}
                  <div
                    className="absolute right-0 top-0 h-full bg-green-500/10 transition-all duration-300"
                    style={{ width: `${bid.depthPercent}%` }}
                  />

                  <div className="text-green-400 font-mono relative z-10 group-hover:text-green-300">
                    {formatPrice(bid.price)}
                  </div>
                  <div className="text-slate-300 font-mono text-right relative z-10">
                    {formatQuantity(bid.quantity)}
                  </div>
                  <div className="text-slate-400 font-mono text-right relative z-10">{formatTotal(bid.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
