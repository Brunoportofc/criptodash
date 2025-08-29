import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MexcClient } from "@/lib/mexc-client"
import type { ApiResponse } from "@/types"
import { decrypt } from "@/lib/encryption"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { accountId, symbol, side, type, quantity, price } = body

    // Validation
    if (!accountId || !symbol || !side || !type || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: accountId, symbol, side, type, quantity",
        },
        { status: 400 },
      )
    }

    if (type === "LIMIT" && !price) {
      return NextResponse.json(
        {
          success: false,
          error: "Price is required for limit orders",
        },
        { status: 400 },
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be greater than 0",
        },
        { status: 400 },
      )
    }

    if (price && price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Price must be greater than 0",
        },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

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

    // Check trading configuration
    const tradingConfig = await prisma.tradingConfig.findUnique({
      where: { userId: user.id },
    })

    if (tradingConfig && !tradingConfig.autoTradingEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Auto trading is disabled",
        },
        { status: 400 },
      )
    }

    // Rate limiting check
    if (tradingConfig) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentOrders = await prisma.order.count({
        where: {
          accountId,
          createdAt: { gte: oneHourAgo },
        },
      })

      if (recentOrders >= tradingConfig.maxOrdersPerHour) {
        return NextResponse.json(
          {
            success: false,
            error: `Rate limit exceeded. Maximum ${tradingConfig.maxOrdersPerHour} orders per hour.`,
          },
          { status: 429 },
        )
      }
    }

    let orderResult
    let mexcOrderId = null

    try {
      // Decrypt API secret and place order on MEXC
      const apiSecret = decrypt(account.apiSecret)
      const mexcClient = new MexcClient(account.apiKey, apiSecret)

      const mexcOrder = await mexcClient.placeOrder({
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase() as "BUY" | "SELL",
        type: type.toUpperCase() as "LIMIT" | "MARKET",
        quantity: Number.parseFloat(quantity),
        price: price ? Number.parseFloat(price) : undefined,
      })

      if (mexcOrder.success) {
        orderResult = mexcOrder.data
        mexcOrderId = orderResult.orderId
      } else {
        throw new Error(mexcOrder.error)
      }
    } catch (error) {
      console.error("MEXC order placement failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Order placement failed: ${error.message}`,
        },
        { status: 400 },
      )
    }

    // Save order to database
    const order = await prisma.order.create({
      data: {
        accountId,
        symbol: symbol.toUpperCase(),
        side: side.toLowerCase(),
        type: type.toLowerCase(),
        quantity: Number.parseFloat(quantity),
        price: price ? Number.parseFloat(price) : 0,
        status: orderResult?.status?.toLowerCase() || "pending",
        mexcOrderId: mexcOrderId?.toString(),
      },
    })

    // Update account last activity
    await prisma.mexcAccount.update({
      where: { id: accountId },
      data: { lastActivity: new Date() },
    })

    // Log order creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_ORDER",
        resource: "TRADING",
        details: `${side.toUpperCase()} ${quantity} ${symbol} at ${price || "market price"}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    })

    const response: ApiResponse = {
      success: true,
      data: {
        ...order,
        mexcData: orderResult,
      },
      message: "Order placed successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Place order error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const whereClause = accountId ? { accountId, account: { userId: user.id } } : { account: { userId: user.id } }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          account: {
            select: {
              accountName: true,
              tokenPair: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where: whereClause }),
    ])

    const response: ApiResponse = {
      success: true,
      data: {
        orders,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
