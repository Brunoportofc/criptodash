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

    const { accountId, symbol, side } = await req.json()

    if (!accountId || !symbol) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const account = await prisma.mexcAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })
    }

    // Decrypt API secret
    const apiSecret = decrypt(account.apiSecret)
    const mexcClient = new MexcClient(account.apiKey, apiSecret)

    // Cancel all orders on MEXC
    const cancelResult = await mexcClient.cancelAllOrders(symbol)

    // Update orders in database
    const whereClause = side ? { accountId, symbol, side, status: "pending" } : { accountId, symbol, status: "pending" }

    await prisma.order.updateMany({
      where: whereClause,
      data: { status: "canceled" },
    })

    const response: ApiResponse = {
      success: true,
      message: `All ${side ? side : ""} orders canceled successfully`,
      data: cancelResult,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Cancel all orders error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
