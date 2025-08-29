import crypto from "crypto"

export class MexcClient {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.baseUrl = "https://api.mexc.com"
    
    console.log("🏗️ MEXC Client initialized:")
    console.log(`   📡 Base URL: ${this.baseUrl}`)
    console.log(`   🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`)
    console.log(`   🔐 Secret: ${apiSecret.substring(0, 4)}...${apiSecret.substring(apiSecret.length - 4)} (${apiSecret.length} chars)`)
  }

  private generateSignature(queryString: string): string {
    console.log("🔐 Generating signature:")
    console.log(`   📝 Query string: ${queryString}`)
    
    // MEXC signature format: HMAC SHA256 of queryString
    const signature = crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex")
    
    console.log(`   ✍️ Generated signature: ${signature.substring(0, 16)}...${signature.substring(signature.length - 8)}`)
    return signature
  }

  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    params: Record<string, any> = {},
  ) {
    console.log(`\n🚀 === MEXC API REQUEST START ===`)
    console.log(`📍 Endpoint: ${method} ${endpoint}`)
    console.log(`📦 Input params:`, params)
    
    try {
      const timestamp = Date.now()
      console.log(`⏰ Timestamp: ${timestamp} (${new Date(timestamp).toISOString()})`)
      
      // Build query string for signature
      console.log(`🔧 Building query parameters...`)
      const allParams = {...params, timestamp}
      console.log(`📋 All params before sorting:`, allParams)
      
      const sortedParams = Object.keys(allParams)
        .sort()
        .reduce((result, key) => {
          const value = key === 'timestamp' ? timestamp : params[key]
          if (value !== undefined && value !== null) {
            result[key] = value
            console.log(`   ✅ Added param: ${key} = ${value}`)
          } else {
            console.log(`   ⏭️ Skipped param: ${key} (null/undefined)`)
          }
          return result
        }, {} as Record<string, any>)
      
      console.log(`📋 Final sorted params:`, sortedParams)
      
      const queryString = new URLSearchParams(sortedParams).toString()
      console.log(`📝 Final query string: ${queryString}`)
      
      const signature = this.generateSignature(queryString)
      
      const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`
      console.log(`🔗 Final URL: ${url.replace(signature, signature.substring(0, 8) + '...')}`)

      const headers = {
        "X-MEXC-APIKEY": this.apiKey,
        "Content-Type": "application/json",
        "User-Agent": "AGD-Trading-Bot/1.0",
      }
      
      console.log(`📤 Request headers:`)
      Object.entries(headers).forEach(([key, value]) => {
        const displayValue = key === "X-MEXC-APIKEY" ? `${value.substring(0, 8)}...` : value
        console.log(`   ${key}: ${displayValue}`)
      })

      console.log(`\n⏳ Sending request to MEXC...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log(`⚠️ Request timeout after 15 seconds`)
        controller.abort()
      }, 15000)

      const startTime = Date.now()
      const response = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
      })
      
      const endTime = Date.now()
      clearTimeout(timeoutId)

      console.log(`📡 MEXC API Response received in ${endTime - startTime}ms`)
      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      console.log(`📋 Response headers:`)
      response.headers.forEach((value, key) => {
        console.log(`   ${key}: ${value}`)
      })

      const responseText = await response.text()
      console.log(`📄 Response body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`)

      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`)
        console.log(`📄 Error response body: ${responseText}`)
        
        let errorMessage = `MEXC API error: ${response.status} ${response.statusText}`

        try {
          const errorData = JSON.parse(responseText)
          console.log(`📋 Parsed error data:`, errorData)
          
          // Common MEXC error codes and solutions
          console.log("🚨 === MEXC API ERROR ANALYSIS ===")
          console.log("❌ Error Code:", errorData.code)
          console.log("❌ Error Message:", errorData.msg || errorData.message)
          
          const errorSolutions = {
            "-1021": "Timestamp outside of recvWindow. Check system time synchronization.",
            "-1022": "Signature verification failed. Check API secret and signature generation.",
            "-2014": "API key format invalid. Check API key format.",
            "-2015": "Invalid API-key, IP, or permissions for action. Check API key permissions and IP whitelist.",
            "1": "Generic error. Check API key and permissions.",
            "10001": "Invalid parameter. Check request parameters.",
            "10002": "Invalid signature. Check signature generation method.",
          }
          
          const solution = errorSolutions[errorData.code?.toString()]
          if (solution) {
            console.log("💡 Suggested solution:", solution)
          }
          console.log("🔚 === ERROR ANALYSIS END ===")
          
          if (errorData.msg) {
            errorMessage = errorData.msg
            console.log(`💬 Error message from API: ${errorData.msg}`)
          } else if (errorData.message) {
            errorMessage = errorData.message
            console.log(`💬 Error message from API: ${errorData.message}`)
          }
          
          // Log specific MEXC error codes if available
          if (errorData.code) {
            console.log(`🔢 MEXC Error Code: ${errorData.code}`)
          }
        } catch (parseError) {
          console.log(`⚠️ Could not parse error response as JSON:`, parseError)
          // If response is not JSON, use the text as error message
          if (responseText) {
            errorMessage = responseText
          }
        }

        console.log(`💥 Final error message: ${errorMessage}`)
        console.log(`🔚 === MEXC API REQUEST FAILED ===\n`)
        throw new Error(errorMessage)
      }

      console.log(`✅ Request successful!`)
      let parsedResponse
      try {
        parsedResponse = JSON.parse(responseText)
        console.log(`📋 Parsed response:`, parsedResponse)
      } catch (parseError) {
        console.log(`⚠️ Could not parse response as JSON:`, parseError)
        parsedResponse = { raw: responseText }
      }
      
      console.log(`🔚 === MEXC API REQUEST SUCCESS ===\n`)
      return parsedResponse
    } catch (error) {
      console.log(`💥 === MEXC API REQUEST EXCEPTION ===`)
      console.log(`🚨 Error type: ${error.constructor.name}`)
      console.log(`🚨 Error name: ${error.name}`)
      console.log(`💬 Error message: ${error.message}`)
      console.log(`📚 Error stack:`, error.stack)
      
      if (error.name === "AbortError") {
        console.log(`⏰ Request was aborted due to timeout`)
        console.log(`🔚 === MEXC API REQUEST TIMEOUT ===\n`)
        throw new Error("Request timeout - MEXC API is not responding")
      }

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        console.log(`🌐 Network error - possibly no internet connection`)
      }

      console.log(`🔚 === MEXC API REQUEST EXCEPTION END ===\n`)
      throw error
    }
  }

  async testConnection() {
    console.log(`\n🔌 === MEXC CONNECTION TEST START ===`)
    try {
      console.log("🔍 Testing MEXC basic connectivity with ping endpoint...")
      const result = await this.makeRequest("/api/v3/ping")
      console.log("✅ MEXC ping successful")
      console.log(`📋 Ping result:`, result)
      console.log(`🔚 === MEXC CONNECTION TEST SUCCESS ===\n`)
      return { success: true, data: result }
    } catch (error) {
      console.log("❌ MEXC ping failed")
      console.log(`💬 Error details: ${error.message}`)
      console.log(`🔚 === MEXC CONNECTION TEST FAILED ===\n`)
      return { success: false, error: error.message }
    }
  }

  async getServerTime() {
    try {
      const result = await this.makeRequest("/api/v3/time")
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getAccount() {
    console.log(`\n👤 === MEXC ACCOUNT INFO TEST START ===`)
    try {
      console.log("🔍 Testing MEXC account access with authenticated endpoint...")
      const result = await this.makeRequest("/api/v3/account")
      console.log("✅ MEXC account access successful")
      console.log(`📋 Account result keys:`, Object.keys(result || {}))
      console.log(`🔚 === MEXC ACCOUNT INFO TEST SUCCESS ===\n`)
      return { success: true, data: result }
    } catch (error) {
      console.log("❌ MEXC account access failed")
      console.log(`💬 Error details: ${error.message}`)
      console.log(`🔚 === MEXC ACCOUNT INFO TEST FAILED ===\n`)
      return { success: false, error: error.message }
    }
  }

  async getExchangeInfo() {
    try {
      console.log("🔍 Getting MEXC exchange info...")
      const result = await this.makeRequest("/api/v3/exchangeInfo")
      console.log("✅ MEXC exchange info retrieved")
      return { success: true, data: result }
    } catch (error) {
      console.error("❌ MEXC exchange info failed:", error)
      return { success: false, error: error.message }
    }
  }

  async getOrderBook(symbol: string) {
    try {
      console.log(`🔍 Getting order book for ${symbol}...`)
      const result = await this.makeRequest("/api/v3/depth", "GET", {
        symbol: symbol.toUpperCase(),
        limit: 20,
      })
      console.log(`✅ Order book for ${symbol} retrieved`)
      return { success: true, data: result }
    } catch (error) {
      console.error(`❌ Order book for ${symbol} failed:`, error)
      return { success: false, error: error.message }
    }
  }

  async get24hrTicker(symbol: string) {
    try {
      console.log(`🔍 Getting 24hr ticker for ${symbol}...`)
      const result = await this.makeRequest("/api/v3/ticker/24hr", "GET", {
        symbol: symbol.toUpperCase(),
      })
      console.log(`✅ 24hr ticker for ${symbol} retrieved`)
      return { success: true, data: result }
    } catch (error) {
      console.error(`❌ 24hr ticker for ${symbol} failed:`, error)
      return { success: false, error: error.message }
    }
  }

  async placeOrder(order: {
    symbol: string
    side: "BUY" | "SELL"
    type: "LIMIT" | "MARKET"
    quantity: number
    price?: number
  }) {
    try {
      console.log(`🔍 Placing ${order.side} order for ${order.symbol}...`)

      const params = {
        symbol: order.symbol.toUpperCase(),
        side: order.side,
        type: order.type,
        quantity: order.quantity.toString(),
        ...(order.price && { price: order.price.toString() }),
        timeInForce: "GTC",
        newOrderRespType: "RESULT",
      }

      const result = await this.makeRequest("/api/v3/order", "POST", params)
      console.log(`✅ Order placed successfully: ${result.orderId}`)
      return { success: true, data: result }
    } catch (error) {
      console.error("❌ Order placement failed:", error)
      return { success: false, error: error.message }
    }
  }

  async cancelOrder(symbol: string, orderId: string) {
    try {
      console.log(`🔍 Canceling order ${orderId} for ${symbol}...`)
      const result = await this.makeRequest("/api/v3/order", "DELETE", {
        symbol: symbol.toUpperCase(),
        orderId,
      })
      console.log(`✅ Order ${orderId} canceled successfully`)
      return { success: true, data: result }
    } catch (error) {
      console.error(`❌ Order cancellation failed:`, error)
      return { success: false, error: error.message }
    }
  }

  async getOpenOrders(symbol?: string) {
    try {
      console.log(`🔍 Getting open orders${symbol ? ` for ${symbol}` : ""}...`)
      const params = symbol ? { symbol: symbol.toUpperCase() } : {}
      const result = await this.makeRequest("/api/v3/openOrders", "GET", params)
      console.log(`✅ Open orders retrieved: ${result.length} orders`)
      return { success: true, data: result }
    } catch (error) {
      console.error("❌ Get open orders failed:", error)
      return { success: false, error: error.message }
    }
  }

  async cancelAllOrders(symbol: string) {
    try {
      console.log(`🔍 Canceling all orders for ${symbol}...`)
      const result = await this.makeRequest("/api/v3/openOrders", "DELETE", {
        symbol: symbol.toUpperCase(),
      })
      console.log(`✅ All orders canceled for ${symbol}`)
      return { success: true, data: result }
    } catch (error) {
      console.error(`❌ Cancel all orders failed:`, error)
      return { success: false, error: error.message }
    }
  }
}
