export interface User {
  id: string
  email: string
  name: string
  image?: string
  has2FA: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MexcAccount {
  id: string
  userId: string
  accountName: string
  apiKey: string
  apiSecret: string
  tokenPair: string
  status: "active" | "inactive" | "suspended"
  balance: number
  vpnLocation: string
  vpnStatus: "connected" | "disconnected"
  lastActivity: Date
  createdAt: Date
}

export interface Order {
  id: string
  accountId: string
  symbol: string
  side: "buy" | "sell"
  type: "limit" | "market"
  quantity: number
  price: number
  status: "pending" | "filled" | "canceled"
  createdAt: Date
  filledAt?: Date
}

export interface OrderBook {
  symbol: string
  bids: Array<{
    price: string
    quantity: string
    total: string
  }>
  asks: Array<{
    price: string
    quantity: string
    total: string
  }>
  timestamp: Date
}

export interface TradingConfig {
  userId: string
  autoTradingEnabled: boolean
  washTradingProtection: boolean
  maxOrdersPerHour: number
  randomDelays: boolean
  userAgentRotation: boolean
  requestFingerprinting: boolean
}

export interface VPNConfig {
  userId: string
  provider: string
  autoRotate: boolean
  rotationInterval: number
  currentLocation: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// NextAuth types extension
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      has2FA?: boolean
    }
  }

  interface User {
    id: string
    has2FA?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    has2FA?: boolean
  }
}
