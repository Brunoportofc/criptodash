"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Chrome, Key, QrCode, Smartphone, Copy, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "firebase/auth"
import { initFirebase } from "@/lib/firebase"

interface LoginFormProps {
  onLoginSuccess: () => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [step, setStep] = useState<"login" | "setup2fa" | "verify2fa">("login")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { toast } = useToast()
  const { login } = useAuth()

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Firebase Google Sign-In no cliente
      await initFirebase()
      const auth = getAuth()
      const provider = new GoogleAuthProvider()

      const result = await signInWithPopup(auth, provider)
      const idToken = await result.user.getIdToken()

      // Trocar o ID token do Firebase por sessão NextAuth via Credentials
      const nextAuthResult = await signIn("credentials", {
        redirect: false,
        idToken,
      })

      if (nextAuthResult?.error) {
        setError("Falha ao autenticar com o servidor. Tente novamente.")
        return
      }

      // Obter sessão do NextAuth
      const session = await getSession()
      if (session?.user) {
        const userData = {
          id: (session.user as any).id || "temp-id",
          name: session.user.name || "Usuário",
          email: session.user.email || "",
          image: session.user.image || "/placeholder.svg?height=40&width=40",
          has2FA: (session.user as any).has2FA || false,
        }

        setUser(userData)
        login(userData)

        if (!userData.has2FA) {
          await setup2FA()
        } else {
          setStep("verify2fa")
        }
      } else {
        setError("Sessão não encontrada após login. Tente novamente.")
      }
    } catch (error) {
      console.error("Firebase Google login error:", error)
      setError("Login com Google (Firebase) falhou. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const setup2FA = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (data.success) {
        setQrCodeUrl(data.data.qrCode)
        setSecretKey(data.data.secret)
        setBackupCodes(data.data.backupCodes)
        setStep("setup2fa")
        toast({
          title: "Configuração 2FA",
          description: "Por favor, configure seu aplicativo autenticador",
          onDismiss: () => {},
        })
      } else {
        setError(data.error || "Falha ao configurar 2FA")
      }
    } catch (error) {
      console.error("2FA setup error:", error)
      setError("Falha ao configurar 2FA. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetup2FA = () => {
    if (!qrCodeUrl || !secretKey) {
      setError("Configuração 2FA incompleta. Tente novamente.")
      return
    }
    setStep("verify2fa")
  }

  const handleVerify2FA = async () => {
    if (twoFactorCode.length !== 6) {
      setError("Por favor, digite um código de 6 dígitos")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: twoFactorCode }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sucesso!",
          description: "2FA verificado com sucesso",
        })
        
        // Login user after 2FA verification
        if (user) {
          login({ ...user, has2FA: true })
        }
        onLoginSuccess()
      } else {
        setError(data.error || "Código de verificação inválido")
        setTwoFactorCode("")
      }
    } catch (error) {
      console.error("2FA verification error:", error)
      setError("Verificação falhou. Tente novamente.")
    } finally {
      setIsLoading(false)
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
      console.error("Copy failed:", error)
      toast({
        title: "Falha ao copiar",
        description: "Por favor, copie manualmente",
        variant: "destructive",
      })
    }
  }

  const handleEmailPasswordLogin = async () => {
    try {
      setIsLoading(true)
      setError("")

      await initFirebase()
      const auth = getAuth()
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      const idToken = await cred.user.getIdToken()

      const nextAuthResult = await signIn("credentials", {
        redirect: false,
        idToken,
      })

      if (nextAuthResult?.error) {
        setError("Falha ao autenticar com o servidor. Verifique suas credenciais.")
        return
      }

      const session = await getSession()
      if (session?.user) {
        const userData = {
          id: (session.user as any).id || "temp-id",
          name: session.user.name || "Usuário",
          email: session.user.email || email.trim(),
          image: session.user.image || "/placeholder.svg?height=40&width=40",
          has2FA: (session.user as any).has2FA || false,
        }

        setUser(userData)
        login(userData)

        if (!userData.has2FA) {
          await setup2FA()
        } else {
          setStep("verify2fa")
        }
      } else {
        setError("Sessão não encontrada após login. Tente novamente.")
      }
    } catch (err: any) {
      console.error("Email/password login error:", err)
      let msg = "Falha no login. Tente novamente."
      if (err?.code === "auth/invalid-email") msg = "Email inválido."
      if (err?.code === "auth/user-disabled") msg = "Usuário desabilitado."
      if (err?.code === "auth/user-not-found") msg = "Usuário não encontrado."
      if (err?.code === "auth/wrong-password") msg = "Senha incorreta."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "login") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-slate-900 border-slate-700">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-100">AGD Trading System</CardTitle>
              <p className="text-slate-400 mt-2">Acesso seguro ao seu painel de trading</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Login por Email/Senha */}
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                autoComplete="current-password"
              />
              <Button
                onClick={handleEmailPasswordLogin}
                disabled={isLoading || !email || !password}
                className="w-full bg-blue-600 hover:bg-blue-700 font-medium py-3 text-base"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Entrando...
                  </div>
                ) : (
                  "Entrar com Email"
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">ou</span>
              </div>
+             </div>

             {/* Login com Google (Firebase) */}
             <div className="space-y-4">
               <Button
                 onClick={handleGoogleLogin}
                 disabled={isLoading}
                 className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 text-base"
               >
                 {isLoading ? (
                   <div className="flex items-center">
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-3"></div>
                     Conectando...
                   </div>
                 ) : (
                   <div className="flex items-center">
                     <Chrome className="w-5 h-5 mr-3" />
                     Continuar com Google
                   </div>
                 )}
               </Button>
             </div>

             <div className="relative">
               <div className="absolute inset-0 flex items-center">
                 <span className="w-full border-t border-slate-700" />
               </div>
               <div className="relative flex justify-center text-xs uppercase">
                 <span className="bg-slate-900 px-2 text-slate-400">Recursos de Segurança</span>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10 p-2 justify-center">
                 <Shield className="w-4 h-4 mr-2" />
                 2FA Obrigatório
               </Badge>
               <Badge variant="outline" className="border-blue-500 text-blue-400 bg-blue-500/10 p-2 justify-center">
                 <Key className="w-4 h-4 mr-2" />
                 OAuth 2.0
               </Badge>
             </div>

             <div className="text-center text-xs text-slate-500">
               Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
             </div>
           </CardContent>
         </Card>
       </div>
     )
   }

   if (step === "setup2fa") {
     return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
         <Card className="w-full max-w-2xl bg-slate-900 border-slate-700">
           <CardHeader className="text-center">
             <CardTitle className="text-2xl text-slate-100">Configurar Autenticação de Dois Fatores</CardTitle>
             <p className="text-slate-400">Proteja sua conta com 2FA para maior segurança</p>
           </CardHeader>
           <CardContent>
             {error && (
               <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg mb-6">
                 <AlertCircle className="w-4 h-4 text-red-400" />
                 <span className="text-red-400 text-sm">{error}</span>
               </div>
             )}

             <Tabs defaultValue="app" className="space-y-6">
               <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                 <TabsTrigger value="app" className="data-[state=active]:bg-slate-700">
                   <Smartphone className="w-4 h-4 mr-2" />
                   App Autenticador
                 </TabsTrigger>
                 <TabsTrigger value="backup" className="data-[state=active]:bg-slate-700">
                   <Key className="w-4 h-4 mr-2" />
                   Códigos de Backup
                 </TabsTrigger>
               </TabsList>

               <TabsContent value="app" className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-slate-200">Passo 1: Escanear Código QR</h3>
                     <div className="bg-white p-4 rounded-lg">
                       {qrCodeUrl ? (
                         <img src={qrCodeUrl || "/placeholder.svg"} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
                       ) : (
                         <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                           <QrCode className="w-24 h-24 text-gray-400" />
                         </div>
                       )}
                     </div>
                     <p className="text-sm text-slate-400">
                       Escaneie este código QR com seu app autenticador (Google Authenticator, Authy, etc.)
                     </p>
                   </div>

                   <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-slate-200">Passo 2: Entrada Manual</h3>
                     <div className="space-y-3">
                       <div>
                         <label className="text-sm font-medium text-slate-400">Nome da Conta</label>
                         <div className="flex items-center gap-2 mt-1">
                           <Input
                             value="AGD Trading System"
                             readOnly
                             className="bg-slate-800 border-slate-600 text-white"
                           />
                           <Button variant="outline" size="sm" onClick={() => copyToClipboard("AGD Trading System")}>
                             <Copy className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>
                       <div>
                         <label className="text-sm font-medium text-slate-400">Chave Secreta</label>
                         <div className="flex items-center gap-2 mt-1">
                           <Input
                             value={secretKey}
                             readOnly
                             className="bg-slate-800 border-slate-600 text-white font-mono"
                           />
                           <Button variant="outline" size="sm" onClick={() => copyToClipboard(secretKey)}>
                             <Copy className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>
                     </div>
                     <p className="text-sm text-slate-400">
                       Se você não conseguir escanear o código QR, digite manualmente estes detalhes no seu app autenticador.
                     </p>
                   </div>
                 </div>

                 <div className="flex justify-center">
                   <Button
                     onClick={handleSetup2FA}
                     className="bg-blue-600 hover:bg-blue-700"
                     disabled={!qrCodeUrl || !secretKey}
                   >
                     Continuar para Verificação
                   </Button>
                 </div>
               </TabsContent>

               <TabsContent value="backup" className="space-y-6">
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-slate-200">Códigos de Recuperação de Backup</h3>
                   <p className="text-slate-400">
                     Salve estes códigos de backup em um local seguro. Você pode usá-los para acessar sua conta se perder
                     seu dispositivo autenticador.
                   </p>

                   <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {backupCodes.map((code, index) => (
                         <div
                           key={index}
                           className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-600"
                         >
                           <span className="font-mono text-slate-200">{code}</span>
                           <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code)}>
                             <Copy className="w-4 h-4" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                     <div className="flex items-start gap-3">
                       <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                       <div>
                         <h4 className="font-medium text-yellow-400">Notas Importantes de Segurança</h4>
                         <ul className="text-sm text-yellow-200 mt-2 space-y-1">
                           <li>• Cada código de backup só pode ser usado uma vez</li>
                           <li>• Armazene estes códigos em um local seguro e offline</li>
                           <li>• Não compartilhe estes códigos com ninguém</li>
                           <li>• Gere novos códigos se suspeitar que foram comprometidos</li>
                         </ul>
                       </div>
                     </div>
                   </div>
                 </div>
               </TabsContent>
             </Tabs>
           </CardContent>
         </Card>
       </div>
     )
   }

   if (step === "verify2fa") {
     return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
         <Card className="w-full max-w-md bg-slate-900 border-slate-700">
           <CardHeader className="text-center space-y-4">
             <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
               <Key className="w-8 h-8 text-white" />
             </div>
             <div>
               <CardTitle className="text-2xl text-slate-100">Autenticação de Dois Fatores</CardTitle>
               <p className="text-slate-400 mt-2">Digite o código de 6 dígitos do seu app autenticador</p>
             </div>
           </CardHeader>
           <CardContent className="space-y-6">
             {user && (
               <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                 <img src={user.image || "/placeholder.svg"} alt={user.name} className="w-10 h-10 rounded-full" />
                 <div>
                   <div className="font-medium text-slate-200">{user.name}</div>
                   <div className="text-sm text-slate-400">{user.email}</div>
                 </div>
               </div>
             )}

             {error && (
               <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                 <AlertCircle className="w-4 h-4 text-red-400" />
                 <span className="text-red-400 text-sm">{error}</span>
               </div>
             )}

             <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-400">Código de Autenticação</label>
                 <Input
                   type="text"
                   placeholder="000000"
                   value={twoFactorCode}
                   onChange={(e) => {
                     const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                     setTwoFactorCode(value)
                     setError("")
                   }}
                   className="bg-slate-800 border-slate-600 text-white text-center text-2xl font-mono tracking-widest"
                   maxLength={6}
                   autoComplete="one-time-code"
                 />
               </div>

               <Button
                 onClick={handleVerify2FA}
                 disabled={twoFactorCode.length !== 6 || isLoading}
                 className="w-full bg-green-600 hover:bg-green-700 font-medium py-3 text-base"
               >
                 {isLoading ? (
                   <div className="flex items-center">
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                     Verificando...
                   </div>
                 ) : (
                   <div className="flex items-center">
                     <CheckCircle className="w-5 h-5 mr-2" />
                     Verificar e Continuar
                   </div>
                 )}
               </Button>
             </div>

             <div className="text-center">
               <Button variant="link" className="text-slate-400 hover:text-slate-300">
                 Usar código de backup
               </Button>
             </div>

             <div className="text-center text-xs text-slate-500">Tendo problemas? Entre em contato com o suporte para assistência</div>
           </CardContent>
         </Card>
       </div>
     )
   }

   return null
}
