"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react"
import { useTrades } from "@/hooks/use-mexc-websocket"
import { cn } from "@/lib/utils"

interface RealTimeTradesProps {
  symbol: string
  maxTrades?: number
  className?: string
}

export function RealTimeTrades({ symbol, maxTrades = 20, className }: RealTimeTradesProps) {
  const { trades, lastUpdate } = useTrades(symbol, maxTrades, 3000)

  const formatPrice = (price: string) => {
    return Number.parseFloat(price).toFixed(5)
  }

  const formatQuantity = (quantity: string) => {
    return Number.parseFloat(quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <Card className={cn("bg-slate-900 border-slate-700", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-100 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Negociações Recentes
          </CardTitle>
          <Badge variant="outline" className="border-slate-600 text-slate-400">
            <RefreshCw className="w-4 h-4 mr-1" />
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Sem dados"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-400">Aguardando negociações...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-700">
              <div className="text-left">Hora</div>
              <div className="text-right">Preço</div>
              <div className="text-right">Quantidade</div>
              <div className="text-center">Lado</div>
            </div>

            {/* Trades */}
            <div className="max-h-96 overflow-y-auto">
              {trades.map((trade, index) => (
                <div
                  key={trade.id}
                  className={cn(
                    "grid grid-cols-4 gap-2 px-4 py-2 text-sm hover:bg-slate-800/50 transition-colors",
                    index === 0 && "bg-slate-800/30", // Highlight newest trade
                  )}
                >
                  <div className="text-slate-400 text-xs">{formatTime(trade.timestamp)}</div>
                  <div className={cn("font-mono text-right", trade.side === "BUY" ? "text-green-400" : "text-red-400")}>
                    {formatPrice(trade.price)}
                  </div>
                  <div className="text-slate-300 font-mono text-right">{formatQuantity(trade.quantity)}</div>
                  <div className="flex justify-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5",
                        trade.side === "BUY"
                          ? "border-green-500 text-green-400 bg-green-500/10"
                          : "border-red-500 text-red-400 bg-red-500/10",
                      )}
                    >
                      {trade.side === "BUY" ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {trade.side}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
