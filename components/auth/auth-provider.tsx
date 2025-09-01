"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { SessionProvider, useSession, signOut } from "next-auth/react"
import { initFirebase } from "@/lib/firebase"

interface User {
  id: string
  name: string
  email: string
  image: string
  has2FA: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  isLoading: boolean
  session: any
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  useEffect(() => {
    // Initialize Firebase on the client, analytics optional
    if (typeof window !== "undefined") {
      initFirebase().catch((e) => console.warn("Firebase init failed:", e?.message || e))
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      const userData: User = {
        id: session.user.id || "temp-id",
        name: session.user.name || "Usuário",
        email: session.user.email || "",
        image: session.user.image || "",
        has2FA: session.user.has2FA || false,
      }
      setUser(userData)
    } else {
      setUser(null)
    }
  }, [session])

  const login = (userData: User) => {
    setUser(userData)
    // NextAuth handles session storage
  }

  const logout = async () => {
    setUser(null)
    await signOut({ redirect: false })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!session,
        login,
        logout,
        isLoading,
        session,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
