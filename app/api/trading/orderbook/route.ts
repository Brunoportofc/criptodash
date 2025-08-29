import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MexcClient } from "@/lib/mexc-client"
import { decrypt } from "@/lib/encryption"
import type { ApiResponse } from "@/types"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get("symbol") || "SOLUSDT"
    const accountId = searchParams.get("accountId")

    let orderBookData

    // For public data (no accountId), fetch directly from MEXC public API
    if (!accountId) {
      try {
        console.log(`🌐 Fetching real orderbook data for ${symbol} from MEXC API`)
        
        // Use public MEXC API endpoint (no authentication required)
        const mexcResponse = await fetch(`https://api.mexc.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=20`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!mexcResponse.ok) {
          throw new Error(`MEXC API error: ${mexcResponse.status} ${mexcResponse.statusText}`)
        }

        const mexcData = await mexcResponse.json()
        console.log(`✅ Successfully fetched real orderbook data for ${symbol}`)
        
        orderBookData = {
          symbol: symbol.toUpperCase(),
          bids: mexcData.bids || [],
          asks: mexcData.asks || [],
          lastUpdateId: mexcData.lastUpdateId
        }
      } catch (error) {
        console.error("❌ Failed to fetch real MEXC data:", error)
        // Fallback to mock data if real API fails
        orderBookData = getMockOrderBook(symbol)
      }
    } else {
      // For authenticated requests with accountId, require session
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      })

      if (!user) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }

      // Use specific account's MEXC connection
      const account = await prisma.mexcAccount.findFirst({
        where: {
          id: accountId,
          userId: user.id,
          status: "active",
        },
      })

      if (!account) {
        return NextResponse.json(
          {
            success: false,
            error: "Account not found or inactive",
          },
          { status: 404 },
        )
      }

      try {
        const apiSecret = decrypt(account.apiSecret)
        const mexcClient = new MexcClient(account.apiKey, apiSecret)
        const result = await mexcClient.getOrderBook(symbol)

        if (result.success) {
          orderBookData = result.data
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error("MEXC API error:", error)
        // Fall back to public API
        try {
          const mexcResponse = await fetch(`https://api.mexc.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=20`)
          const mexcData = await mexcResponse.json()
          orderBookData = {
            symbol: symbol.toUpperCase(),
            bids: mexcData.bids || [],
            asks: mexcData.asks || []
          }
        } catch (fallbackError) {
          orderBookData = getMockOrderBook(symbol)
        }
      }
    }

    // Format order book data
    const formattedOrderBook = {
      symbol,
      bids:
        orderBookData.bids?.map((bid: any) => ({
          price: typeof bid[0] === "string" ? bid[0] : bid[0]?.toString(),
          quantity: typeof bid[1] === "string" ? bid[1] : bid[1]?.toString(),
          total: (Number.parseFloat(bid[0]) * Number.parseFloat(bid[1])).toFixed(2),
        })) || [],
      asks:
        orderBookData.asks?.map((ask: any) => ({
          price: typeof ask[0] === "string" ? ask[0] : ask[0]?.toString(),
          quantity: typeof ask[1] === "string" ? ask[1] : ask[1]?.toString(),
          total: (Number.parseFloat(ask[0]) * Number.parseFloat(ask[1])).toFixed(2),
        })) || [],
      timestamp: new Date(),
    }

    const response: ApiResponse = {
      success: true,
      data: formattedOrderBook,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get orderbook error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

function getMockOrderBook(symbol: string) {
  // Generate appropriate mock data based on symbol
  let basePrice: number
  let priceStep: number
  let baseQuantity: number
  
  switch (symbol.toUpperCase()) {
    case "SOLUSDT":
      basePrice = 145.50
      priceStep = 0.25
      baseQuantity = 10
      break
    case "USDTBRL":
      basePrice = 5.45
      priceStep = 0.01
      baseQuantity = 100
      break
    case "AGDUSDT":
    default:
      basePrice = 0.025
      priceStep = 0.00005
      baseQuantity = 5000
      break
  }
  
  // Generate bids (buy orders) - prices decrease
  const bids = []
  for (let i = 0; i < 7; i++) {
    const price = (basePrice - (i * priceStep)).toFixed(symbol === "USDTBRL" ? 3 : symbol === "SOLUSDT" ? 2 : 5)
    const quantity = (baseQuantity + Math.random() * baseQuantity * 0.2).toFixed(symbol === "SOLUSDT" ? 1 : 0)
    bids.push([price, quantity])
  }
  
  // Generate asks (sell orders) - prices increase
  const asks = []
  for (let i = 1; i <= 7; i++) {
    const price = (basePrice + (i * priceStep)).toFixed(symbol === "USDTBRL" ? 3 : symbol === "SOLUSDT" ? 2 : 5)
    const quantity = (baseQuantity + Math.random() * baseQuantity * 0.2).toFixed(symbol === "SOLUSDT" ? 1 : 0)
    asks.push([price, quantity])
  }
  
  return {
    symbol,
    bids,
    asks,
  }
}
