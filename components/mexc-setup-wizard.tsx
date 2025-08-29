"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Wallet,
  Key,
  Settings,
  Copy,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { MexcValidationResult } from "@/lib/mexc-config"

interface MexcSetupWizardProps {
  onAccountAdded: () => void
}

export default function MexcSetupWizard({ onAccountAdded }: MexcSetupWizardProps) {
  const [step, setStep] = useState(1)
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState(() => ({
    accountName: "Segunda Conta MEXC",
    apiKey: "",
    apiSecret: "",
    vpnLocation: "Singapore",
  }))
  const [showSecrets, setShowSecrets] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [validationResult, setValidationResult] = useState<MexcValidationResult | null>(null)
  const [validationProgress, setValidationProgress] = useState(0)
  const { toast } = useToast()

  const resetForm = () => {
    console.log("🔄 RESETTING FORM - Clearing all fields")
    const newFormData = {
      accountName: "",
      apiKey: "",
      apiSecret: "",
      vpnLocation: "Singapore",
    }
    console.log("🔄 New form data:", newFormData)
    setFormData(newFormData)
    setStep(1)
    setIsValidating(false)
    setIsSaving(false)
    setValidationResult(null)
    setValidationProgress(0)
    setShowSecrets(false)
  }

  const validateCredentials = async () => {
    console.log("🚀 Frontend: Starting validation with formData:", {
      accountName: formData.accountName,
      apiKeyStart: formData.apiKey.substring(0, 8),
      apiKeyEnd: formData.apiKey.substring(formData.apiKey.length - 4),
      apiKeyLength: formData.apiKey.length,
      secretLength: formData.apiSecret.length
    })
    
    if (!formData.apiKey || !formData.apiSecret) {
      toast({
        title: "Erro",
        description: "Por favor, insira tanto a Chave API quanto o Segredo",
        variant: "destructive",
      })
      return
    }

    setIsValidating(true)
    setValidationProgress(0)

    try {
      // Simulate validation steps with progress
      const steps = [
        "Testando conexão...",
        "Validando credenciais...",
        "Verificando permissões...",
        "Verificando saldos...",
        "Testando acesso AGD/USDT...",
      ]

      for (let i = 0; i < steps.length; i++) {
        setValidationProgress((i / steps.length) * 100)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log("📤 Frontend: Sending validation request with:", {
        apiKey: formData.apiKey.substring(0, 8) + "..." + formData.apiKey.substring(formData.apiKey.length - 4),
        apiKeyLength: formData.apiKey.length,
        secretLength: formData.apiSecret.length
      })
      
      const response = await fetch("/api/mexc/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
        }),
      })

      const data = await response.json()
      setValidationProgress(100)

      if (data.success) {
        setValidationResult(data.data)
        if (data.data.isValid) {
          toast({
            title: "Sucesso!",
          description: "Credenciais MEXC validadas com sucesso",
          })
          setStep(3)
        } else {
          toast({
            title: "Problemas de Validação",
          description: "Por favor, verifique os resultados da validação",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Validação Falhou",
        description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Validation error:", error)
      toast({
        title: "Erro",
        description: "Falha ao validar credenciais",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  const saveAccount = async () => {
    if (!validationResult?.isValid) {
      toast({
        title: "Erro",
      description: "Por favor, valide as credenciais primeiro",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      console.log("💾 Frontend: Saving account with:", {
        accountName: formData.accountName,
        apiKey: formData.apiKey.substring(0, 8) + "..." + formData.apiKey.substring(formData.apiKey.length - 4),
        apiKeyLength: formData.apiKey.length,
        secretLength: formData.apiSecret.length,
        vpnLocation: formData.vpnLocation
      })
      
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: formData.accountName,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          tokenPair: "AGD/USDT",
          vpnLocation: formData.vpnLocation,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sucesso!",
        description: "Conta MEXC adicionada com sucesso",
        })
        setIsOpen(false)
        resetForm()
        onAccountAdded()
      } else {
        toast({
          title: "Erro",
        description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Erro",
        description: "Falha ao salvar conta",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência",
      })
    } catch (error) {
      toast({
        title: "Falha ao copiar",
        description: "Por favor, copie manualmente",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        resetForm() // Reset form when closing modal
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Key className="w-4 h-4 mr-2" />
          Adicionar Conta MEXC
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-100">Configuração da Conta MEXC</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure suas credenciais da API MEXC para trading de tokens AGD
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className={`flex items-center ${stepNum < 4 ? "flex-1" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {step > stepNum ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > stepNum ? "bg-blue-600" : "bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Instructions */}
          {step === 1 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-slate-100 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Passo 1: Criar Chaves API MEXC
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-blue-500 bg-blue-500/10">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-200">
                    Você precisa criar chaves API na MEXC para conectar sua conta. Siga estes passos cuidadosamente.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-slate-200">📋 Instruções Passo a Passo:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                      <li>
                        Vá para{" "}
                        <a
                          href="https://www.mexc.com/user/api"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 inline-flex items-center"
                        >
                          Gerenciamento de API MEXC
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </li>
                      <li>Clique no botão "Create API"</li>
                      <li>Digite um rótulo (ex: "AGD Trading Bot")</li>
                      <li>
                        <strong>Habilitar permissões:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>✅ Spot Trading</li>
                          <li>❌ Futures Trading (não necessário)</li>
                          <li>❌ Withdraw (não recomendado)</li>
                        </ul>
                      </li>
                      <li>Complete a verificação 2FA</li>
                      <li>Copie sua Chave API e Chave Secreta</li>
                    </ol>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-400">Recomendações de Segurança</h4>
                        <ul className="text-sm text-yellow-200 mt-2 space-y-1">
                          <li>• Habilite apenas a permissão "Spot Trading"</li>
                          <li>• Nunca compartilhe suas chaves API com ninguém</li>
                          <li>• Use lista branca de IP se possível</li>
                          <li>• Rotacione suas chaves API regularmente</li>
                          <li>• Mantenha sua chave secreta segura e criptografada</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700">
                    Tenho minhas chaves API
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Enter Credentials */}
          {step === 2 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-slate-100 flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Passo 2: Inserir Credenciais da API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Nome da Conta</label>
                    <Input
                      placeholder="Minha Conta MEXC"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Localização VPN</label>
                    <select
                      value={formData.vpnLocation}
                      onChange={(e) => setFormData({ ...formData, vpnLocation: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-white"
                    >
                      <option value="Singapore">Singapore</option>
                      <option value="Japan">Japan</option>
                      <option value="Hong Kong">Hong Kong</option>
                      <option value="Taiwan">Taiwan</option>
                      <option value="South Korea">South Korea</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Chave API</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      placeholder="mx0vGL..."
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="border-slate-600"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Chave Secreta</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      placeholder="Digite sua chave secreta..."
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="bg-slate-900 border-slate-600 text-white font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formData.apiSecret)}
                      className="border-slate-600"
                      disabled={!formData.apiSecret}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isValidating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Validando credenciais...</span>
                      <span className="text-slate-400">{Math.round(validationProgress)}%</span>
                    </div>
                    <Progress value={validationProgress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} className="border-slate-600">
                    Voltar
                  </Button>
                  <Button
                    onClick={validateCredentials}
                    disabled={isValidating || !formData.apiKey || !formData.apiSecret}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Validar Credenciais
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Validation Results */}
          {step === 3 && validationResult && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-slate-100 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Passo 3: Resultados da Validação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Status */}
                <Alert
                  className={
                    validationResult.isValid ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
                  }
                >
                  {validationResult.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <AlertDescription className={validationResult.isValid ? "text-green-200" : "text-red-200"}>
                    {validationResult.isValid
                      ? "✅ Credenciais validadas com sucesso! Pronto para negociar."
                      : "❌ Validação falhou. Por favor, verifique os problemas abaixo."}
                  </AlertDescription>
                </Alert>

                {/* Account Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-sm text-slate-400">Tipo de Conta</div>
                    <div className="text-lg font-semibold text-slate-200">{validationResult.accountType}</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-sm text-slate-400">Trading Habilitado</div>
                    <div className="text-lg font-semibold">
                      {validationResult.canTrade ? (
                        <span className="text-green-400">✅ Sim</span>
                      ) : (
                        <span className="text-red-400">❌ Não</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <div className="text-sm text-slate-400">Permissões</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {validationResult.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Balances */}
                {validationResult.balances && validationResult.balances.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-200">Saldos da Conta</h4>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-4 text-sm font-medium text-slate-400 mb-2">
                        <div>Ativo</div>
                        <div>Disponível</div>
                        <div>Bloqueado</div>
                      </div>
                      {validationResult.balances.slice(0, 5).map((balance) => (
                        <div key={balance.asset} className="grid grid-cols-3 gap-4 text-sm text-slate-300 py-1">
                          <div className="font-mono">{balance.asset}</div>
                          <div className="font-mono">{Number.parseFloat(balance.free).toFixed(8)}</div>
                          <div className="font-mono">{Number.parseFloat(balance.locked).toFixed(8)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-400">❌ Erros</h4>
                    <div className="space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <div
                          key={index}
                          className="bg-red-900/20 border border-red-700/50 rounded p-2 text-sm text-red-200"
                        >
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-400">⚠️ Avisos</h4>
                    <div className="space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="bg-yellow-900/20 border border-yellow-700/50 rounded p-2 text-sm text-yellow-200"
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} className="border-slate-600">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-validar
                  </Button>
                  {validationResult.isValid && (
                    <Button onClick={saveAccount} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Adicionar Conta
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
