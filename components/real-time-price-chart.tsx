"use client"

import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, Time } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, Zap } from "lucide-react"
import { useKline } from "@/hooks/use-mexc-websocket"
import { useTickerSSE } from "@/hooks/use-stream"
import dynamic from "next/dynamic"

interface RealTimePriceChartProps {
  symbol: string
  className?: string
}

type IntervalValue = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

interface Candle {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface PriceIndicator {
  price: number
  change: number
  changePercent: number
  isPositive: boolean
}

// Função para calcular EMA
function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return []
  const ema = [data[0]]
  const multiplier = 2 / (period + 1)
  
  for (let i = 1; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1]
  }
  
  return ema
}

const RealTimePriceChart = memo(function RealTimePriceChart({ symbol, className }: RealTimePriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const priceLineRef = useRef<ISeriesApi<"Line"> | null>(null)
  const priceIndicatorRef = useRef<HTMLDivElement | null>(null)
  const volumeIndicatorRef = useRef<HTMLDivElement | null>(null)
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const volatilityIndicatorRef = useRef<HTMLDivElement | null>(null)
  
  const [interval, setInterval] = useState<IntervalValue>("1m")
  const [priceIndicator, setPriceIndicator] = useState<PriceIndicator | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [lastPrice, setLastPrice] = useState<number | null>(null)
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral')
  const [volumeSpike, setVolumeSpike] = useState(false)
  const [volatility, setVolatility] = useState(0)
  const [volumeProfile, setVolumeProfile] = useState<'low' | 'medium' | 'high' | 'extreme'>('low')
  
  // Hooks para dados em tempo real com otimização
  const { klines, lastUpdate } = useKline(symbol, interval)
  const { data: sseTicker } = useTickerSSE(symbol)
  
  // Debounce para atualizações de preço
  const [debouncedPrice, setDebouncedPrice] = useState<number | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Processar dados de klines
  const candles: Candle[] = useMemo(() => {
    const mapped = klines.map((k) => ({
      time: Math.floor(k.openTime / 1000) as Time,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume),
    }))
    
    // Remover duplicatas e ordenar
    const byTime = new Map<number, Candle>()
    for (const c of mapped) {
      byTime.set(Number(c.time), c)
    }
    const deduped = Array.from(byTime.values())
    deduped.sort((a, b) => Number(a.time) - Number(b.time))
    
    return deduped
  }, [klines])
  
  // Calcular indicadores
  const closes = useMemo(() => candles.map((c) => c.close), [candles])
  const ema21 = useMemo(() => calculateEMA(closes, 21), [closes])
  
  // Determinar precisão de preço
  const priceDecimals = useMemo(() => {
    const last = closes[closes.length - 1]
    if (!last || Number.isNaN(last)) return 5
    if (last >= 100) return 2
    if (last >= 1) return 4
    return 6
  }, [closes])
  
  // Atualizar indicador de preço com animação
  const updatePriceIndicator = useCallback((newPrice: number) => {
    if (lastPrice !== null) {
      const change = newPrice - lastPrice
      const changePercent = (change / lastPrice) * 100
      const isPositive = change >= 0
      
      setPriceIndicator({
        price: newPrice,
        change,
        changePercent,
        isPositive
      })
      
      // Definir direção do preço
      setPriceDirection(isPositive ? 'up' : 'down')
      
      // Animação de piscada do preço
      if (priceIndicatorRef.current && !isAnimating) {
        setIsAnimating(true)
        
        import('animejs').then((animeModule) => {
          const anime = animeModule.default || animeModule
          if (typeof anime === 'function') {
            anime({
              targets: priceIndicatorRef.current,
              backgroundColor: isPositive ? '#10b981' : '#ef4444',
              scale: [1, 1.05, 1],
              duration: 400,
              easing: 'easeOutElastic(1, .8)',
              complete: () => {
                setIsAnimating(false)
                if (priceIndicatorRef.current && typeof anime === 'function') {
                  anime({
                    targets: priceIndicatorRef.current,
                    backgroundColor: 'transparent',
                    duration: 800,
                    easing: 'easeOutQuad'
                  })
                }
              }
            })
          } else {
            setIsAnimating(false)
          }
        }).catch((error) => {
          console.error('Failed to load anime.js:', error)
          setIsAnimating(false)
        })
      }
      
      // Animação do container do gráfico
      if (chartContainerRef.current) {
        import('animejs').then((animeModule) => {
          const anime = animeModule.default || animeModule
          if (typeof anime === 'function') {
            anime({
              targets: chartContainerRef.current,
              boxShadow: isPositive 
                ? '0 0 30px rgba(16, 185, 129, 0.3)' 
                : '0 0 30px rgba(239, 68, 68, 0.3)',
              duration: 600,
              easing: 'easeOutQuad',
              complete: () => {
                if (chartContainerRef.current && typeof anime === 'function') {
                  anime({
                    targets: chartContainerRef.current,
                    boxShadow: '0 0 0px rgba(0, 0, 0, 0)',
                    duration: 1500,
                    easing: 'easeOutQuad'
                  })
                }
              }
            })
          }
        }).catch((error) => {
          console.error('Failed to load anime.js for chart container:', error)
        })
      }
    }
    setLastPrice(newPrice)
  }, [lastPrice, isAnimating])
  
  // Debounce para atualizações de preço (otimização de performance)
  useEffect(() => {
    if (!sseTicker?.price) return
    
    const newPrice = parseFloat(sseTicker.price)
    
    // Debounce para evitar muitas atualizações
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedPrice(newPrice)
    }, 100) // 100ms debounce
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [sseTicker?.price])
  
  // Atualizar preço quando ticker SSE chegar (otimizado)
  useEffect(() => {
    if (debouncedPrice === null) return
    
    // Evitar atualizações desnecessárias
    if (lastPrice !== null && Math.abs(debouncedPrice - lastPrice) < 0.0001) return
    
    updatePriceIndicator(debouncedPrice)
  }, [debouncedPrice, updatePriceIndicator, lastPrice])
  
  // Inicializar gráfico
  useEffect(() => {
    if (!containerRef.current) return
    
    const chart = createChart(containerRef.current, {
      layout: {
        background: { 
          type: ColorType.Solid,
          color: '#0f172a'
        },
        textColor: '#e2e8f0',
      },
      rightPriceScale: {
        borderColor: '#475569',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: interval === "1m",
      },
      grid: {
        horzLines: { color: '#334155' },
        vertLines: { color: '#334155' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      watermark: {
        visible: false,
      },
    })
    
    // Série de candlesticks com gradiente
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: priceDecimals,
        minMove: Number('1e-' + priceDecimals) as unknown as number,
      },
    })
    
    // Série de volume com transparência
    const volumeSeries = chart.addHistogramSeries({
      priceScaleId: '',
      color: '#3b82f680',
      priceFormat: { type: 'volume' },
      scaleMargins: { top: 0.8, bottom: 0 },
    })
    
    // EMA 21 com brilho
    const emaSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceFormat: { type: 'price', precision: priceDecimals },
    })
    
    // Linha de preço atual piscante
    const priceLine = chart.addLineSeries({
      color: '#e2e8f0',
      lineWidth: 3,
      lineStyle: LineStyle.Solid,
      priceFormat: { type: 'price', precision: priceDecimals },
      lastValueVisible: true,
      priceLineVisible: true,
    })
    
    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries
    emaSeriesRef.current = emaSeries
    priceLineRef.current = priceLine
    
    return () => {
      chart.remove()
    }
  }, [priceDecimals, interval])
  
  // Detectar picos de volume e calcular volatilidade
  useEffect(() => {
    if (candles.length < 20) return
    
    const currentVolume = candles[candles.length - 1]?.volume || 0
    const avgVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / Math.min(10, candles.length)
    
    // Análise de volume
    if (currentVolume > avgVolume * 2.5) {
      setVolumeProfile('extreme')
      setVolumeSpike(true)
      setTimeout(() => setVolumeSpike(false), 3000)
      
      // Animação de pico de volume
      if (volumeIndicatorRef.current) {
        import('animejs').then((animeModule) => {
          const anime = animeModule.default
          anime({
            targets: volumeIndicatorRef.current,
            scale: [1, 1.2, 1],
            backgroundColor: ['transparent', '#f59e0b40', 'transparent'],
            duration: 1500,
            easing: 'easeOutBounce'
          })
        })
      }
    } else if (currentVolume > avgVolume * 1.8) {
      setVolumeProfile('high')
    } else if (currentVolume > avgVolume * 1.2) {
      setVolumeProfile('medium')
    } else {
      setVolumeProfile('low')
    }
    
    // Cálculo de volatilidade (desvio padrão dos últimos 20 preços)
    const recentPrices = candles.slice(-20).map(c => c.close)
    const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / recentPrices.length
    const stdDev = Math.sqrt(variance)
    const volatilityPercent = (stdDev / avgPrice) * 100
    
    setVolatility(volatilityPercent)
    
    // Animar indicador de volatilidade se alta
    if (volatilityPercent > 2 && volatilityIndicatorRef.current) {
      import('animejs').then((animeModule) => {
        const anime = animeModule.default
        anime({
          targets: volatilityIndicatorRef.current,
          scale: [1, 1.1, 1],
          duration: 1000,
          easing: 'easeOutElastic(1, .8)'
        })
      })
    }
  }, [candles])
  
  // Memoizar dados processados do gráfico
  const processedCandles = useMemo(() => {
    return candles.map(candle => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }))
  }, [candles])
  
  const processedVolumes = useMemo(() => {
    return candles.map(candle => ({
      time: candle.time,
      value: candle.volume,
      color: candle.close >= candle.open ? '#10b98140' : '#ef444440'
    }))
  }, [candles])
  
  // Atualizar dados do gráfico (otimizado)
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current || !emaSeriesRef.current || !priceLineRef.current) return
    if (processedCandles.length === 0) return
    
    // Usar dados memoizados para melhor performance
    candleSeriesRef.current.setData(processedCandles)
    volumeSeriesRef.current.setData(processedVolumes)
    
    // Atualizar EMA (otimizado)
    if (ema21.length > 0) {
      const emaData = ema21.map((value, index) => ({
        time: processedCandles[index]?.time,
        value
      })).filter(item => item.time !== undefined)
      
      emaSeriesRef.current.setData(emaData)
    }
    
    // Atualizar linha de preço atual (otimizado)
    if (processedCandles.length > 0) {
      const lastCandle = candles[candles.length - 1]
      const priceLineColor = priceDirection === 'up' ? '#10b981' : priceDirection === 'down' ? '#ef4444' : '#e2e8f0'
      
      priceLineRef.current.applyOptions({
        color: priceLineColor,
        lineWidth: priceDirection !== 'neutral' ? 4 : 3,
      })
      
      priceLineRef.current.setData([{
        time: lastCandle.time,
        value: lastCandle.close
      }])
    }
    
    // Ajustar visualização apenas quando necessário
    if (processedCandles.length > 0) {
      chartRef.current.timeScale().fitContent()
    }
    
  }, [processedCandles, processedVolumes, candles, ema21, priceDirection])
  
  // Função para animar indicador de volume (otimizada)
  const animateVolumeIndicator = useCallback(async () => {
    if (volumeIndicatorRef.current) {
      const anime = (await import('animejs')).default
      anime({
        targets: volumeIndicatorRef.current,
        scale: [1, 1.1, 1],
        duration: 600, // Reduzido de 800ms para 600ms
        easing: 'easeOutBounce'
      })
    }
  }, [])
  
  // Callback otimizado para mudança de intervalo
  const handleIntervalChange = useCallback((newInterval: IntervalValue) => {
    setInterval(newInterval)
  }, [])
  
  // Callback otimizado para refresh
  const handleRefresh = useCallback(() => {
    // Implementar lógica de refresh se necessário
    window.location.reload()
  }, [])
  
  // Intervalos disponíveis (memoizado)
  const intervals: { label: string; value: IntervalValue }[] = useMemo(() => [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "1d", value: "1d" },
  ], [])
  
  return (
    <Card className={cn("bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl ring-1 ring-slate-600/20", className)}>
      <CardHeader className="pb-4 bg-gradient-to-r from-slate-800/30 to-slate-700/30 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-slate-100 flex items-center">
            <div className="relative mr-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-30" />
            </div>
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-bold">
              Gráfico em Tempo Real - {symbol.toUpperCase()}
            </span>
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* Indicador de preço animado */}
            {priceIndicator && (
              <div 
                ref={priceIndicatorRef}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-600"
              >
                <div className="flex items-center gap-1">
                  {priceIndicator.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-lg font-bold text-slate-100">
                    ${priceIndicator.price.toFixed(priceDecimals)}
                  </span>
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  priceIndicator.isPositive ? "text-green-400" : "text-red-400"
                )}>
                  {priceIndicator.isPositive ? "+" : ""}{priceIndicator.changePercent.toFixed(2)}%
                </div>
              </div>
            )}
            
            {/* Seletor de intervalo */}
            <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-600/50 shadow-inner">
              {intervals.map((int) => (
                <Button
                  key={int.value}
                  size="sm"
                  variant={interval === int.value ? "default" : "ghost"}
                  onClick={() => handleIntervalChange(int.value)}
                  className={cn(
                    "text-xs px-3 py-2 font-medium transition-all duration-300 rounded-lg",
                    interval === int.value 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 border-0 scale-105" 
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50 hover:scale-105"
                  )}
                >
                  {int.label}
                </Button>
              ))}
            </div>
            
            {/* Status de atualização */}
            <Badge variant="outline" className="border-slate-600/50 text-slate-300 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 text-yellow-400 animate-ping opacity-30">
                    <Zap className="w-3 h-3" />
                  </div>
                </div>
                <span className="text-xs font-medium">
                  {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Conectando..."}
                </span>
              </div>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          <div 
            ref={chartContainerRef}
            className="relative rounded-xl overflow-hidden transition-all duration-300 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-slate-900/50"
          >
            <div ref={containerRef} className="w-full h-[500px] relative" />
            
            {/* Overlay de brilho sutil */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-slate-800/10 pointer-events-none rounded-xl" />
            
            {/* Overlay de direção do preço */}
            {priceDirection !== 'neutral' && (
              <div className={cn(
                "absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500",
                priceDirection === 'up' ? "bg-green-500/5" : "bg-red-500/5"
              )} />
            )}
          </div>
          
          {/* Overlay de volume animado */}
          <div 
            ref={volumeIndicatorRef}
            className={cn(
              "absolute top-6 left-6 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-xl px-4 py-3 border transition-all duration-300 cursor-pointer shadow-2xl hover:scale-105",
              volumeProfile === 'extreme'
                ? "border-red-500/50 shadow-2xl shadow-red-500/30 bg-gradient-to-br from-red-900/20 to-slate-900/95"
                : volumeSpike 
                ? "border-yellow-500/50 shadow-2xl shadow-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-slate-900/95" 
                : "border-slate-600/50 hover:border-slate-500/50 hover:shadow-2xl hover:shadow-slate-500/20"
            )}
            onClick={animateVolumeIndicator}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-300">Volume</span>
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                volumeProfile === 'extreme' 
                  ? "bg-red-400 animate-pulse shadow-lg shadow-red-400/50"
                  : volumeProfile === 'high'
                  ? "bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50"
                  : volumeProfile === 'medium'
                  ? "bg-green-400"
                  : "bg-blue-400"
              )} />
              <span className={cn(
                "text-xs capitalize font-medium",
                volumeProfile === 'extreme' && "text-red-400",
                volumeProfile === 'high' && "text-yellow-400",
                volumeProfile === 'medium' && "text-green-400",
                volumeProfile === 'low' && "text-blue-400"
              )}>
                {volumeProfile}
              </span>
            </div>
            <div className={cn(
              "text-sm font-bold transition-all duration-300",
              volumeProfile === 'extreme'
                ? "text-red-400 drop-shadow-lg"
                : volumeSpike 
                ? "text-yellow-400 drop-shadow-lg" 
                : "text-blue-400 hover:text-blue-300"
            )}>
              {candles.length > 0 ? candles[candles.length - 1]?.volume.toLocaleString() : "--"}
            </div>
          </div>
          
          {/* Indicador de Volatilidade */}
          <div 
            ref={volatilityIndicatorRef}
            className={cn(
              "absolute top-6 left-6 mt-20 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-xl px-4 py-3 border transition-all duration-300 cursor-pointer shadow-2xl hover:scale-105",
              volatility > 3
                ? "border-red-500/50 shadow-2xl shadow-red-500/30 bg-gradient-to-br from-red-900/20 to-slate-900/95"
                : volatility > 2
                ? "border-yellow-500/50 shadow-2xl shadow-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-slate-900/95"
                : "border-slate-600/50 hover:border-slate-500/50 hover:shadow-2xl hover:shadow-slate-500/20"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-300">Volatilidade</span>
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                volatility > 3 
                  ? "bg-red-400 animate-pulse shadow-lg shadow-red-400/50"
                  : volatility > 2
                  ? "bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50"
                  : volatility > 1
                  ? "bg-green-400"
                  : "bg-gray-400"
              )} />
            </div>
            <div className={cn(
              "text-sm font-bold transition-all duration-300",
              volatility > 3
                ? "text-red-400 drop-shadow-lg"
                : volatility > 2
                ? "text-yellow-400 drop-shadow-lg"
                : "text-green-400 hover:text-green-300"
            )}>
              {volatility.toFixed(2)}%
            </div>
          </div>
          
          {/* Indicador de conexão e direção */}
          <div className="absolute top-6 right-6 space-y-3">
            <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-xl px-4 py-3 border border-slate-600/50 shadow-2xl">
              <div className="relative">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-30" />
              </div>
              <span className="text-xs font-medium text-slate-200">Ao Vivo</span>
              <div className="w-1 h-1 bg-slate-500 rounded-full" />
              <span className="text-xs text-slate-400">Real-time</span>
            </div>
            
            {/* Indicador de direção do preço */}
            {priceDirection !== 'neutral' && (
              <div className={cn(
                "flex items-center gap-3 backdrop-blur-md rounded-xl px-4 py-3 border transition-all duration-500 shadow-2xl hover:scale-105",
                priceDirection === 'up' 
                  ? "bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/50 shadow-green-500/25" 
                  : "bg-gradient-to-r from-red-900/30 to-rose-900/30 border-red-500/50 shadow-red-500/25"
              )}>
                <div className={cn(
                  "p-1.5 rounded-lg shadow-lg",
                  priceDirection === 'up' 
                    ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                    : "bg-gradient-to-br from-red-500 to-rose-600"
                )}>
                  {priceDirection === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-white" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-bold tracking-wide",
                  priceDirection === 'up' ? "text-green-400" : "text-red-400"
                )}>
                  {priceDirection === 'up' ? 'ALTA' : 'BAIXA'}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default RealTimePriceChart