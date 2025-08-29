"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, RefreshCw } from "lucide-react"
import { useKline } from "@/hooks/use-mexc-websocket"
import { cn } from "@/lib/utils"

interface PriceChartProps {
  symbol: string
  className?: string
}

interface ChartData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function PriceChart({ symbol, className }: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [interval, setInterval] = useState("1m")
  const [hoveredCandle, setHoveredCandle] = useState<ChartData | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const { klines, lastUpdate } = useKline(symbol, interval)

  const chartData: ChartData[] = klines
    .map((kline) => ({
      time: kline.openTime,
      open: Number.parseFloat(kline.open),
      high: Number.parseFloat(kline.high),
      low: Number.parseFloat(kline.low),
      close: Number.parseFloat(kline.close),
      volume: Number.parseFloat(kline.volume),
    }))
    .reverse() // Reverse to show oldest first

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || chartData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 60, bottom: 40, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Clear canvas
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, width, height)

    if (chartData.length === 0) {
      ctx.fillStyle = "#64748b"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Carregando dados do gráfico...", width / 2, height / 2)
      return
    }

    // Calculate price range
    const prices = chartData.flatMap((d) => [d.high, d.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const pricePadding = priceRange * 0.1

    // Calculate volume range
    const maxVolume = Math.max(...chartData.map((d) => d.volume))

    // Helper functions
    const getX = (index: number) => padding.left + (index / (chartData.length - 1)) * chartWidth
    const getY = (price: number) =>
      padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight
    const candleWidth = Math.max(2, (chartWidth / chartData.length) * 0.8)

    // Draw grid lines
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1

    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange * i) / 5
      const y = getY(price)
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      // Price labels
      ctx.fillStyle = "#64748b"
      ctx.font = "12px monospace"
      ctx.textAlign = "left"
      ctx.fillText(price.toFixed(5), width - padding.right + 5, y + 4)
    }

    // Vertical grid lines (time)
    const timeStep = Math.max(1, Math.floor(chartData.length / 6))
    for (let i = 0; i < chartData.length; i += timeStep) {
      const x = getX(i)
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()

      // Time labels
      const time = new Date(chartData[i].time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      ctx.fillStyle = "#64748b"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(time, x, height - padding.bottom + 20)
    }

    // Draw candlesticks
    chartData.forEach((candle, index) => {
      const x = getX(index)
      const openY = getY(candle.open)
      const closeY = getY(candle.close)
      const highY = getY(candle.high)
      const lowY = getY(candle.low)

      const isGreen = candle.close > candle.open
      const color = isGreen ? "#10b981" : "#ef4444"

      // Draw wick
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = color
      const bodyHeight = Math.abs(closeY - openY)
      const bodyY = Math.min(openY, closeY)
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight))
    })

    // Draw volume bars at bottom
    const volumeHeight = 60
    const volumeY = height - padding.bottom - volumeHeight

    chartData.forEach((candle, index) => {
      const x = getX(index)
      const volumeBarHeight = (candle.volume / maxVolume) * volumeHeight
      const isGreen = candle.close > candle.open

      ctx.fillStyle = isGreen ? "#10b98133" : "#ef444433"
      ctx.fillRect(x - candleWidth / 2, volumeY + volumeHeight - volumeBarHeight, candleWidth, volumeBarHeight)
    })
  }, [chartData])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || chartData.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePos({ x: event.clientX, y: event.clientY })

    const padding = { left: 60, right: 60 }
    const chartWidth = rect.width - padding.left - padding.right

    if (x >= padding.left && x <= rect.width - padding.right) {
      const index = Math.round(((x - padding.left) / chartWidth) * (chartData.length - 1))
      if (index >= 0 && index < chartData.length) {
        setHoveredCandle(chartData[index])
      } else {
        setHoveredCandle(null)
      }
    } else {
      setHoveredCandle(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredCandle(null)
  }

  const intervals = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "1d", value: "1d" },
  ]

  return (
    <Card className={cn("bg-slate-900 border-slate-700", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-100 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Gráfico de Preços - {symbol.toUpperCase()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {intervals.map((int) => (
                <Button
                  key={int.value}
                  size="sm"
                  variant={interval === int.value ? "default" : "outline"}
                  onClick={() => setInterval(int.value)}
                  className={cn(
                    "text-xs px-2 py-1",
                    interval === int.value
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-slate-600 text-slate-400 hover:bg-slate-700",
                  )}
                >
                  {int.label}
                </Button>
              ))}
            </div>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              <RefreshCw className="w-4 h-4 mr-1" />
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Sem dados"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full h-96 border border-slate-700 rounded cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />

          {/* Tooltip */}
          {hoveredCandle && (
            <div
              className="absolute z-10 bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm pointer-events-none"
              style={{
                left: mousePos.x + 10,
                top: mousePos.y - 100,
                transform: "translate(-50%, 0)",
              }}
            >
              <div className="space-y-1">
                <div className="text-slate-400">{new Date(hoveredCandle.time).toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Abertura:</span>
                    <span className="text-slate-200 ml-2 font-mono">{hoveredCandle.open.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Máxima:</span>
                    <span className="text-green-400 ml-2 font-mono">{hoveredCandle.high.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Mínima:</span>
                    <span className="text-red-400 ml-2 font-mono">{hoveredCandle.low.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fechamento:</span>
                    <span className="text-slate-200 ml-2 font-mono">{hoveredCandle.close.toFixed(5)}</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-600">
                  <span className="text-slate-400">Volume:</span>
                  <span className="text-blue-400 ml-2 font-mono">{hoveredCandle.volume.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
