"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Shield, Eye, EyeOff, LogOut, User, ChevronDown, AlertCircle, Loader2, Activity, Trash2 } from "lucide-react"
import { useAuth } from "./components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import MexcSetupWizard from "./components/mexc-setup-wizard"
import { RealTimeOrderBook } from "./components/real-time-orderbook"
import { RealTimeTrades } from "./components/real-time-trades"
import RealTimePriceChart from "./components/real-time-price-chart"
import { ProfileSettingsModal } from "./components/profile-settings-modal"

interface MexcAccount {
  id: string
  accountName: string
  apiKey: string
  tokenPair: string
  status: string
  balance: number
  vpnLocation: string
  vpnStatus: string
  lastActivity: string
}

export default function MEXCAGDDashboard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()

  // Wrapper para compatibilidade de tipagem do toast
  const notify = (args: { title?: string; description?: any; variant?: "default" | "destructive" }) =>
    (toast as any)({ onDismiss: () => undefined, ...args })

  // State
  const [accounts, setAccounts] = useState<MexcAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<MexcAccount | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState("SOLUSDT") // Default to SOL/USDT
  const [price, setPrice] = useState("")
  const [amount, setAmount] = useState("")
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(true)
  const [washTradingProtection, setWashTradingProtection] = useState(true)

  // Available trading pairs
  const tradingPairs = [
    { value: "SOLUSDT", label: "SOL/USDT", name: "Solana" },
    { value: "USDTBRL", label: "USDT/BRL", name: "Tether" },
    { value: "AGDUSDT", label: "AGD/USDT", name: "AGD Token" },
  ]

  // Loading states
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [isCancelingOrders, setIsCancelingOrders] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState<string | null>(null)

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [])

  // WebSocket removido - usando dados reais via API REST

  const loadAccounts = async () => {
    try {
      setIsLoadingAccounts(true)
      const response = await fetch("/api/accounts")
      const data = await response.json()

      if (data.success) {
        setAccounts(data.data)
        if (data.data.length > 0 && !selectedAccount) {
          setSelectedAccount(data.data[0])
        }
      } else {
        notify({
          title: "Erro",
          description: data.error || "Falha ao carregar contas",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Load accounts error:", error)
      notify({
        title: "Erro",
        description: "Falha ao carregar contas",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  const deleteAccount = async (accountId: string, accountName: string) => {
    // Confirmação com o usuário
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Tem certeza que deseja excluir a conta "${accountName}"?\n\n` +
      `Esta ação irá:\n` +
      `• Remover permanentemente a conta do sistema\n` +
      `• Cancelar todas as ordens pendentes\n` +
      `• Não pode ser desfeita\n\n` +
      `Clique em "OK" para confirmar ou "Cancelar" para voltar.`
    )
    
    if (!confirmed) return

    try {
      setIsDeletingAccount(accountId)
      
      const response = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })

      const data = await response.json()

      if (data.success) {
        notify({
          title: "✅ Conta Excluída",
          description: `A conta "${accountName}" foi excluída com sucesso`,
        })
        
        // Atualizar lista de contas
        await loadAccounts()
        
        // Limpar seleção se a conta excluída era a selecionada
        if (selectedAccount?.id === accountId) {
          const remainingAccounts = accounts.filter(acc => acc.id !== accountId)
          setSelectedAccount(remainingAccounts.length > 0 ? remainingAccounts[0] : null)
        }
      } else {
        throw new Error(data.error || "Falha ao excluir conta")
      }
    } catch (error: any) {
      console.error("Delete account error:", error)
        notify({
        title: "❌ Erro ao Excluir",
        description: error.message || "Falha ao excluir conta",
        variant: "destructive",
      })
    } finally {
      setIsDeletingAccount(null)
    }
  }

  const placeOrder = async (side: "buy" | "sell") => {
    if (!selectedAccount || !price || !amount) {
      notify({
        title: "Erro",
        description: "Por favor, preencha todos os campos e selecione uma conta",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(price) <= 0 || Number.parseFloat(amount) <= 0) {
      notify({
        title: "Erro",
        description: "Preço e quantidade devem ser maiores que 0",
        variant: "destructive",
      })
      return
    }

    // 🛡️ Wash Trading Protection
    if (washTradingProtection) {
      const currentPrice = Number.parseFloat(price)
      
      // Simular verificação de ordens existentes (na implementação real, vem da API)
      const existingOrders = [
        { side: "BUY", price: currentPrice - 0.0001 },
        { side: "SELL", price: currentPrice + 0.0001 }
      ]
      
      const oppositeOrders = existingOrders.filter(order => {
        if (side === "buy") {
          return order.side === "SELL" && Math.abs(order.price - currentPrice) < 0.001
        } else {
          return order.side === "BUY" && Math.abs(order.price - currentPrice) < 0.001
        }
      })
      
      if (oppositeOrders.length > 0) {
        notify({
          title: "🛡️ Proteção contra Wash Trading",
          description: `Ordem bloqueada: Preço muito próximo à sua ordem ${oppositeOrders[0].side} existente. Isso pode ser considerado wash trading.`,
          variant: "destructive",
        })
        return
      }
      
      console.log("🛡️ Wash Trading Protection: Order approved")
    }

    try {
      setIsPlacingOrder(true)
      const response = await fetch("/api/trading/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          symbol: selectedSymbol,
          side: side.toUpperCase(),
          type: "LIMIT",
          quantity: Number.parseFloat(amount),
          price: Number.parseFloat(price),
        }),
      })

      const data = await response.json()

      if (data.success) {
        notify({
          title: "Sucesso",
          description: `Ordem de ${side.toUpperCase() === 'BUY' ? 'COMPRA' : 'VENDA'} executada com sucesso`,
        })
        setPrice("")
        setAmount("")
      } else {
        notify({
          title: "Erro",
          description: data.error || "Falha ao executar ordem",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Place order error:", error)
      notify({
        title: "Erro",
        description: "Falha ao executar ordem",
        variant: "destructive",
      })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const cancelAllOrders = async (side?: "buy" | "sell") => {
    if (!selectedAccount) {
      notify({
        title: "Erro",
        description: "Por favor, selecione uma conta",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCancelingOrders(true)
      const response = await fetch("/api/trading/cancel-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          symbol: "AGDUSDT",
          side: side?.toUpperCase(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        notify({
          title: "Sucesso",
          description: data.message || "Ordens canceladas com sucesso",
        })
      } else {
        notify({
          title: "Erro",
          description: data.error || "Falha ao cancelar ordens",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Cancel orders error:", error)
      notify({
        title: "Erro",
        description: "Falha ao cancelar ordens",
        variant: "destructive",
      })
    } finally {
      setIsCancelingOrders(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-100">Centro de Controle de Liquidez AGD Token</h1>
            <p className="text-slate-400 mt-2">MEXC Exchange - Sistema de Trading em Tempo Real</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-lg border border-slate-600">
              <Shield className={`w-4 h-4 ${washTradingProtection ? "text-green-400" : "text-slate-400"}`} />
              <span className="text-sm text-slate-300">Proteção contra Wash Trading</span>
              <Switch
                checked={washTradingProtection}
                onCheckedChange={setWashTradingProtection}
                className="data-[state=checked]:bg-green-600"
              />
              <Badge 
                variant="outline" 
                className={washTradingProtection 
                  ? "border-green-500 text-green-400 bg-green-500/10" 
                  : "border-slate-500 text-slate-400 bg-slate-500/10"
                }
              >
                {washTradingProtection ? "ATIVO" : "INATIVO"}
              </Badge>
            </div>

            {/* WebSocket removido - usando API REST para dados reais */}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-800">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || "/placeholder.svg"} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-200">{user?.name}</div>
                    <div className="text-xs text-slate-400">{user?.email}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
                <DropdownMenuItem 
                  className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                  onClick={() => {
                    setIsProfileModalOpen(true)
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Configurações do Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                  <Shield className="w-4 h-4 mr-2" />
                  Configurações de Segurança
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem onClick={logout} className="text-red-400 hover:bg-slate-700 hover:text-red-300">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="trading" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="trading" className="data-[state=active]:bg-slate-700">
              <Activity className="w-4 h-4 mr-2" />
              Trading em Tempo Real
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-slate-700">
              Gerenciamento de Contas
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700">
              Análises & Gráficos
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-slate-700">
              Segurança & VPN
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="space-y-6">
            {/* Real-Time Trading Grid */}
            <div className="grid grid-cols-12 gap-6 min-h-[800px]">
              {/* Column 1: MEXC Accounts (25%) */}
              <div className="col-span-3">
                <Card className="bg-slate-900 border-slate-700 h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                      <CardTitle className="text-xl text-slate-100">Contas MEXC</CardTitle>
                      <p className="text-sm text-slate-400 mt-1">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} conectada{accounts.length !== 1 ? 's' : ''}</p>
                    </div>
                    <MexcSetupWizard onAccountAdded={loadAccounts} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingAccounts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-slate-400">Carregando contas...</span>
                      </div>
                    ) : accounts.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4 font-medium">Nenhuma conta MEXC configurada</p>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                          Adicione sua primeira conta MEXC para começar o trading em tempo real
                        </p>
                        <MexcSetupWizard onAccountAdded={loadAccounts} />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                        {accounts.map((account, index) => (
                          <Card
                            key={account.id}
                            className={`cursor-pointer transition-all duration-200 border ${
                              selectedAccount?.id === account.id
                                ? "bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/20"
                                : "bg-slate-800/50 border-slate-600 hover:bg-slate-800 hover:border-slate-500"
                            }`}
                            onClick={() => setSelectedAccount(account)}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {/* Header with name and status */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                      account.status === "active" ? "bg-green-500" : "bg-red-500"
                                    }`}>
                                      {account.accountName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <h3 className="text-slate-200 font-medium text-sm">{account.accountName}</h3>
                                      <p className="text-xs text-slate-500">{account.apiKey}</p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      account.status === "active"
                                        ? "border-green-500 text-green-400 bg-green-500/10"
                                        : "border-red-500 text-red-400 bg-red-500/10"
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                        account.status === "active" ? "bg-green-500" : "bg-red-500"
                                      }`}
                                    />
                                    {account.status}
                                  </Badge>
                                </div>

                                {/* Balance and info */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Saldo</span>
                                    <span className="text-slate-300 font-mono text-sm font-medium">
                                      {account.balance.toFixed(2)} USDT
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Localização</span>
                                    <span className="text-slate-300 text-xs">{account.vpnLocation}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Última Atividade</span>
                                    <span className="text-slate-400 text-xs">{account.lastActivity}</span>
                                  </div>
                                </div>

                                {/* Selected indicator */}
                                {selectedAccount?.id === account.id && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-600">
                                    <Activity className="w-3 h-3 text-blue-400" />
                                    <span className="text-xs text-blue-400 font-medium">Ativo para trading</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Column 2: Real-Time Order Book (45%) */}
              <div className="col-span-5">
                <RealTimeOrderBook symbol={selectedSymbol} onPriceSelect={setPrice} className="h-full" />
              </div>

              {/* Column 3: Trading Controls & Recent Trades (30%) */}
              <div className="col-span-4 space-y-4">
                {/* Trading Pair Selector */}
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-100">Par de Trading</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {tradingPairs.map((pair) => (
                          <SelectItem key={pair.value} value={pair.value} className="text-white hover:bg-slate-700">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">{pair.label}</span>
                              <span className="text-slate-400 text-sm">({pair.name})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Execute Trade Card */}
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-100">Executar Trade {selectedSymbol}</CardTitle>
                    {selectedAccount && <p className="text-sm text-slate-400">Usando: {selectedAccount.accountName}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        Preço ({selectedSymbol.includes('BRL') ? 'BRL' : 'USDT'})
                      </label>
                      <Input
                        type="number"
                        placeholder={selectedSymbol === 'SOLUSDT' ? '150.00' : selectedSymbol === 'USDTBRL' ? '5.50' : '0.02500'}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 font-mono"
                        step={selectedSymbol === 'SOLUSDT' ? '0.01' : selectedSymbol === 'USDTBRL' ? '0.001' : '0.00001'}
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">
                        Quantidade ({selectedSymbol.split('USDT')[0] || selectedSymbol.split('BRL')[0]})
                      </label>
                      <Input
                        type="number"
                        placeholder={selectedSymbol === 'SOLUSDT' ? '1.0' : selectedSymbol === 'USDTBRL' ? '100' : '1000'}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 font-mono"
                        step={selectedSymbol === 'SOLUSDT' ? '0.01' : selectedSymbol === 'USDTBRL' ? '0.1' : '1'}
                        min="0"
                      />
                    </div>

                    {price && amount && (
                      <div className="text-sm text-slate-400">
                        Total: {(Number.parseFloat(price) * Number.parseFloat(amount)).toFixed(4)} {selectedSymbol.includes('BRL') ? 'BRL' : 'USDT'}
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base"
                        onClick={() => placeOrder("buy")}
                        disabled={isPlacingOrder || !selectedAccount || !price || !amount}
                      >
                        {isPlacingOrder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Colocar Ordem de COMPRA
                      </Button>
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 text-base"
                        onClick={() => placeOrder("sell")}
                        disabled={isPlacingOrder || !selectedAccount || !price || !amount}
                      >
                        {isPlacingOrder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Colocar Ordem de VENDA
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card className="bg-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-100">Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full border-red-600/50 text-red-400 hover:bg-red-600 hover:text-white bg-transparent hover:border-red-600 transition-colors"
                      onClick={() => cancelAllOrders("buy")}
                      disabled={isCancelingOrders || !selectedAccount}
                    >
                      {isCancelingOrders ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cancelar Todas as Ofertas
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-red-600/50 text-red-400 hover:bg-red-600 hover:text-white bg-transparent hover:border-red-600 transition-colors"
                      onClick={() => cancelAllOrders("sell")}
                      disabled={isCancelingOrders || !selectedAccount}
                    >
                      {isCancelingOrders ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cancelar Todas as Vendas
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-yellow-600/50 text-yellow-400 hover:bg-yellow-600 hover:text-white bg-transparent hover:border-yellow-600 transition-colors"
                      onClick={() => cancelAllOrders()}
                      disabled={isCancelingOrders || !selectedAccount}
                    >
                      {isCancelingOrders ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Parada de Emergência
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Trades */}
                <RealTimeTrades symbol={selectedSymbol} maxTrades={20} className="flex-1" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Chart */}
              <div className="lg:col-span-2">
                <RealTimePriceChart symbol={selectedSymbol} />
              </div>

              {/* WebSocket Debug Panel removido - usando API REST */}

              {/* Trading Statistics */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-100">Estatísticas de Trading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-sm text-slate-400">Total de Ordens</div>
                      <div className="text-2xl font-bold text-slate-200">0</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-sm text-slate-400">Taxa de Sucesso</div>
                      <div className="text-2xl font-bold text-green-400">0%</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-sm text-slate-400">Volume Total</div>
                      <div className="text-2xl font-bold text-slate-200">0 USDT</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-sm text-slate-400">Latência Média</div>
                      <div className="text-2xl font-bold text-blue-400">0ms</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-slate-100">Configuração de Contas MEXC</CardTitle>
                  <MexcSetupWizard onAccountAdded={loadAccounts} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {accounts.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">Nenhuma Conta MEXC</h3>
                    <p className="text-slate-400 mb-6">
                      Você ainda não configurou nenhuma conta MEXC. Adicione sua primeira conta para começar a negociar.
                    </p>
                    <MexcSetupWizard onAccountAdded={loadAccounts} />
                  </div>
                ) : (
                  accounts.map((account) => (
                    <div key={account.id} className="border border-slate-700 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-200">{account.accountName}</h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${
                              account.status === "active"
                                ? "border-green-500 text-green-400 bg-green-500/10"
                                : "border-red-500 text-red-400 bg-red-500/10"
                            }`}
                          >
                            {account.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAccount(account.id, account.accountName)}
                            disabled={isDeletingAccount === account.id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-700/50 hover:border-red-600"
                          >
                            {isDeletingAccount === account.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                Excluindo...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-400">Chave API</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type={showApiKeys ? "text" : "password"}
                              value={account.apiKey}
                              className="bg-slate-800 border-slate-600 text-white font-mono"
                              readOnly
                            />
                            <Button variant="outline" size="sm" onClick={() => setShowApiKeys(!showApiKeys)}>
                              {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-400">Localização VPN</label>
                          <Select defaultValue={account.vpnLocation.toLowerCase()}>
                            <SelectTrigger className="bg-slate-800 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="singapore">Singapore</SelectItem>
                              <SelectItem value="japan">Japan</SelectItem>
                              <SelectItem value="hong kong">Hong Kong</SelectItem>
                              <SelectItem value="taiwan">Taiwan</SelectItem>
                              <SelectItem value="south korea">South Korea</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="bg-slate-800 rounded-lg p-3">
                          <div className="text-sm text-slate-400">Saldo</div>
                          <div className="text-lg font-semibold text-slate-200">{account.balance.toFixed(2)} USDT</div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                          <div className="text-sm text-slate-400">Par de Token</div>
                          <div className="text-lg font-semibold text-slate-200">{account.tokenPair}</div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                          <div className="text-sm text-slate-400">Última Atividade</div>
                          <div className="text-lg font-semibold text-slate-200">{account.lastActivity}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-100">Configurações VPN & Proxy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Provedor VPN</label>
                    <Select defaultValue="nordvpn">
                      <SelectTrigger className="bg-slate-800 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nordvpn">NordVPN</SelectItem>
                        <SelectItem value="expressvpn">ExpressVPN</SelectItem>
                        <SelectItem value="surfshark">Surfshark</SelectItem>
                        <SelectItem value="custom">Proxy Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Rotação Automática de Locais</label>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Intervalo de Rotação (minutos)</label>
                    <Input type="number" defaultValue="30" className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-100">Configurações Anti-Detecção</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Atrasos Aleatórios</span>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Rotação de User Agent</span>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Fingerprinting de Requisições</span>
                    <Switch defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Máximo de Ordens por Hora</label>
                    <Input type="number" defaultValue="50" className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Profile Settings Modal */}
       <ProfileSettingsModal 
         isOpen={isProfileModalOpen} 
         onOpenChange={setIsProfileModalOpen} 
       />
    </div>
  )
}
