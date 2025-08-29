"use client"
import { AuthProvider, useAuth } from "../components/auth/auth-provider"
import LoginForm from "../components/auth/login-form"
import MEXCAGDDashboard from "../dashboard"
import ErrorBoundary from "../components/error-boundary"
import { Toaster } from "@/components/ui/toaster"

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={() => {}} />
  }

  return <MEXCAGDDashboard />
}

export default function Page() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}
