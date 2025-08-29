// MEXC API Configuration and Validation
export const MEXC_CONFIG = {
  // Production API
  PROD_BASE_URL: "https://api.mexc.com",

  // Testnet API (if available)
  TESTNET_BASE_URL: "https://api.mexc.com", // MEXC doesn't have separate testnet

  // API Endpoints
  ENDPOINTS: {
    PING: "/api/v3/ping",
    TIME: "/api/v3/time",
    ACCOUNT: "/api/v3/account",
    DEPTH: "/api/v3/depth",
    ORDER: "/api/v3/order",
    OPEN_ORDERS: "/api/v3/openOrders",
    TICKER_24HR: "/api/v3/ticker/24hr",
    EXCHANGE_INFO: "/api/v3/exchangeInfo",
  },

  // Rate Limits (requests per minute)
  RATE_LIMITS: {
    WEIGHT_LIMIT: 1200, // per minute
    ORDER_LIMIT: 100, // per 10 seconds
    RAW_REQUEST_LIMIT: 6000, // per 5 minutes
  },

  // Required permissions for trading
  REQUIRED_PERMISSIONS: [
    "SPOT", // Spot trading
  ],

  // Trading pair configurations
  TRADING_PAIRS: {
    AGD: {
      SYMBOL: "AGDUSDT",
      MIN_QUANTITY: 1,
      MIN_NOTIONAL: 5, // Minimum order value in USDT
      TICK_SIZE: 0.00001, // Price precision
      STEP_SIZE: 1, // Quantity precision
    },
    USDT: {
      SYMBOL: "USDTBRL", // USDT/BRL pair
      MIN_QUANTITY: 0.1,
      MIN_NOTIONAL: 10, // Minimum order value in BRL
      TICK_SIZE: 0.001, // Price precision
      STEP_SIZE: 0.1, // Quantity precision
    },
    SOL: {
      SYMBOL: "SOLUSDT",
      MIN_QUANTITY: 0.01,
      MIN_NOTIONAL: 5, // Minimum order value in USDT
      TICK_SIZE: 0.01, // Price precision
      STEP_SIZE: 0.01, // Quantity precision
    },
  },

  // Backward compatibility - keeping AGD_CONFIG for existing code
  AGD_CONFIG: {
    SYMBOL: "AGDUSDT",
    MIN_QUANTITY: 1,
    MIN_NOTIONAL: 5, // Minimum order value in USDT
    TICK_SIZE: 0.00001, // Price precision
    STEP_SIZE: 1, // Quantity precision
  },
}

export interface MexcCredentials {
  apiKey: string
  apiSecret: string
  environment: "production" | "testnet"
}

export interface MexcValidationResult {
  isValid: boolean
  permissions: string[]
  accountType: string
  canTrade: boolean
  canWithdraw: boolean
  errors: string[]
  warnings: string[]
  balances?: Array<{
    asset: string
    free: string
    locked: string
  }>
}
