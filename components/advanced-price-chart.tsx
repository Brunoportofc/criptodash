"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, Time } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BarChart3, RefreshCw, Settings2 } from "lucide-react"
import { useKline } from "@/hooks/use-mexc-websocket"
import { useTickerSSE } from "@/hooks/use-stream"

type IntervalValue = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

interface AdvancedPriceChartProps {
  symbol: string
  className?: string
}

type Candle = {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const k = 2 / (period + 1)
  const ema: number[] = []
  let prevEma = values[0]
  ema.push(prevEma)
  for (let i = 1; i < values.length; i++) {
    prevEma = values[i] * k + prevEma * (1 - k)
    ema.push(prevEma)
  }
  return ema
}

function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) sma.push(sum / period)
    else sma.push(values[i])
  }
  return sma
}

function calculateBollingerBands(values: number[], period = 20, multiplier = 2) {
  const sma = calculateSMA(values, period)
  const upper: number[] = []
  const lower: number[] = []
  for (let i = 0; i < values.length; i++) {
    // Standard deviation over the last N elements
    const start = Math.max(0, i - period + 1)
    const windowValues = values.slice(start, i + 1)
    const mean = windowValues.reduce((a, b) => a + b, 0) / windowValues.length
    const variance = windowValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / windowValues.length
    const std = Math.sqrt(variance)
    upper.push(sma[i] + multiplier * std)
    lower.push(sma[i] - multiplier * std)
  }
  return { middle: sma, upper, lower }
}

export function AdvancedPriceChart({ symbol, className }: AdvancedPriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const lastPriceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)

  const [interval, setInterval] = useState<IntervalValue>("1m")
  const [showEMA9, setShowEMA9] = useState(true)
  const [showEMA21, setShowEMA21] = useState(true)
  const [showBB, setShowBB] = useState(true)
  const [hoverData, setHoverData] = useState<Candle | null>(null)

  // Atualização de klines com backoff automático; ticker de alta frequência moderada para micro-updates
  const { klines, lastUpdate } = useKline(symbol, interval)
  const { data: sseTicker } = useTickerSSE(symbol)

  // Utilitário: segundos por intervalo
  const intervalSeconds = useMemo(() => {
    const map: Record<IntervalValue, number> = {
      "1m": 60,
      "5m": 300,
      "15m": 900,
      "1h": 3600,
      "4h": 14400,
      "1d": 86400,
    }
    return map[interval]
  }, [interval])

  const candles: Candle[] = useMemo(() => {
    const mapped = klines.map((k) => ({
      time: Math.floor(k.openTime / 1000) as Time,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume),
    }))

    // Remover duplicatas por timestamp mantendo o último valor
    const byTime = new Map<number, Candle>()
    for (const c of mapped) {
      byTime.set(Number(c.time), c)
    }
    const deduped = Array.from(byTime.values())

    // Garantir ordem ASC por tempo
    deduped.sort((a, b) => Number(a.time) - Number(b.time))
    return deduped
  }, [klines])

  const closes = useMemo(() => candles.map((c) => c.close), [candles])

  const ema9 = useMemo(() => calculateEMA(closes, 9), [closes])
  const ema21 = useMemo(() => calculateEMA(closes, 21), [closes])
  const bb = useMemo(() => calculateBollingerBands(closes, 20, 2), [closes])

  const priceDecimals = useMemo(() => {
    const last = closes[closes.length - 1]
    if (!last || Number.isNaN(last)) return 5
    if (last >= 100) return 2
    if (last >= 1) return 4
    return 6
  }, [closes])

  useEffect(() => {
    if (!containerRef.current) return

    // Criar gráfico
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#cbd5e1",
      },
      rightPriceScale: {
        borderColor: "#334155",
        autoScale: true,
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: interval === "1m",
      },
      grid: {
        horzLines: { color: "#1e293b" },
        vertLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: 0, // Normal
      },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: priceDecimals,
        minMove: Number("1e-" + priceDecimals) as unknown as number,
      },
    })

    const volumeSeries = chart.addHistogramSeries({
      priceScaleId: "",
      color: "#60a5fa33",
      priceFormat: { type: "volume" },
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const ema9Series = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceFormat: { type: "price", precision: priceDecimals },
    })

    const ema21Series = chart.addLineSeries({
      color: "#22d3ee",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceFormat: { type: "price", precision: priceDecimals },
    })

    const bbUpperSeries = chart.addLineSeries({
      color: "#a78bfa",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceFormat: { type: "price", precision: priceDecimals },
    })
    const bbLowerSeries = chart.addLineSeries({
      color: "#a78bfa",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceFormat: { type: "price", precision: priceDecimals },
    })

    const lastPriceSeries = chart.addLineSeries({
      color: "#e5e7eb",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      priceFormat: { type: "price", precision: priceDecimals },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    ema9SeriesRef.current = ema9Series
    ema21SeriesRef.current = ema21Series
    bbUpperSeriesRef.current = bbUpperSeries
    bbLowerSeriesRef.current = bbLowerSeries
    lastPriceSeriesRef.current = lastPriceSeries

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      chartRef.current.resize(clientWidth, clientHeight)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chartRef.current?.remove()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, priceDecimals])

  // Atualizar dados das séries quando candles mudarem
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return

    const candleData = candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    candleSeriesRef.current.setData(candleData)

    const volumeData = candles.map((c, i) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? "#10b98133" : "#ef444433",
    }))
    volumeSeriesRef.current.setData(volumeData)

    chartRef.current?.timeScale().fitContent()

    // Indicadores
    if (ema9SeriesRef.current) {
      if (showEMA9) {
        ema9SeriesRef.current.setData(candles.map((c, i) => ({ time: c.time, value: ema9[i] })))
      } else {
        ema9SeriesRef.current.setData([])
      }
    }
    if (ema21SeriesRef.current) {
      if (showEMA21) {
        ema21SeriesRef.current.setData(candles.map((c, i) => ({ time: c.time, value: ema21[i] })))
      } else {
        ema21SeriesRef.current.setData([])
      }
    }
    if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      if (showBB) {
        bbUpperSeriesRef.current.setData(candles.map((c, i) => ({ time: c.time, value: bb.upper[i] })))
        bbLowerSeriesRef.current.setData(candles.map((c, i) => ({ time: c.time, value: bb.lower[i] })))
      } else {
        bbUpperSeriesRef.current.setData([])
        bbLowerSeriesRef.current.setData([])
      }
    }
  }, [candles, ema9, ema21, bb, showEMA9, showEMA21, showBB])

  // Micro-atualização do candle atual com base no ticker (seguro e em ordem)
  useEffect(() => {
    if (!sseTicker || !candleSeriesRef.current || candles.length === 0) return
    const last = candles[candles.length - 1]
    const lastTimeSec = Number(last.time)
    const nowSec = Math.floor(Date.now() / 1000)
    if (nowSec - lastTimeSec >= intervalSeconds) return
    const price = parseFloat(sseTicker.price)
    if (!isFinite(price)) return
    const updated = {
      time: Number(last.time) as unknown as Time,
      open: last.open,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price,
    }
    candleSeriesRef.current.update(updated as any)
    if (lastPriceSeriesRef.current) {
      lastPriceSeriesRef.current.update({ time: Number(last.time) as unknown as Time, value: price } as any)
    }
  }, [sseTicker, candles, intervalSeconds])

  // Crosshair tooltip
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return

    const chart = chartRef.current
    const series = candleSeriesRef.current

    const onCrosshairMove = (param: any) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null)
        return
      }
      const candle = param.seriesData.get(series) as any
      if (candle && typeof candle.open === "number") {
        const volPoint = param.seriesData.get(volumeSeriesRef.current as any) as any
        setHoverData({
          time: param.time as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: volPoint?.value ?? 0,
        })
      } else {
        setHoverData(null)
      }
    }

    chart.subscribeCrosshairMove(onCrosshairMove)

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove)
    }
  }, [])

  const intervals: { label: string; value: IntervalValue }[] = [
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
            Gráfico Profissional - {symbol.toUpperCase()}
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
                    interval === int.value ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-400 hover:bg-slate-700",
                  )}
                >
                  {int.label}
                </Button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-1 ml-2">
              <Button size="sm" variant={showEMA9 ? "default" : "outline"} onClick={() => setShowEMA9((v) => !v)} className={cn("text-xs px-2 py-1", showEMA9 ? "bg-amber-600 hover:bg-amber-700" : "border-slate-600 text-slate-400 hover:bg-slate-700")}>EMA 9</Button>
              <Button size="sm" variant={showEMA21 ? "default" : "outline"} onClick={() => setShowEMA21((v) => !v)} className={cn("text-xs px-2 py-1", showEMA21 ? "bg-cyan-600 hover:bg-cyan-700" : "border-slate-600 text-slate-400 hover:bg-slate-700")}>EMA 21</Button>
              <Button size="sm" variant={showBB ? "default" : "outline"} onClick={() => setShowBB((v) => !v)} className={cn("text-xs px-2 py-1", showBB ? "bg-violet-600 hover:bg-violet-700" : "border-slate-600 text-slate-400 hover:bg-slate-700")}>BB</Button>
            </div>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              <RefreshCw className="w-4 h-4 mr-1" />
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Sem dados"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          <div ref={containerRef} className="w-full h-[480px]" />

          {/* Tooltip rico */}
          {hoverData && (
            <div className="absolute top-2 right-2 z-10 bg-slate-800/95 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
              <div className="text-slate-400">
                {(() => {
                  const d = new Date((hoverData.time as number) * 1000)
                  try {
                    // @ts-ignore
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
                  } catch {
                    return d.toLocaleString()
                  }
                })()}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1">
                <div>
                  <span className="text-slate-400">Abertura:</span>
                  <span className="text-slate-200 ml-2 font-mono">{hoverData.open.toFixed(priceDecimals)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Máxima:</span>
                  <span className="text-green-400 ml-2 font-mono">{hoverData.high.toFixed(priceDecimals)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Mínima:</span>
                  <span className="text-red-400 ml-2 font-mono">{hoverData.low.toFixed(priceDecimals)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Fechamento:</span>
                  <span className="text-slate-200 ml-2 font-mono">{hoverData.close.toFixed(priceDecimals)}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-600 mt-2">
                <span className="text-slate-400">Volume:</span>
                <span className="text-blue-400 ml-2 font-mono">{hoverData.volume.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default AdvancedPriceChart


