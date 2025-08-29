import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

export async function GET(req: NextRequest) {
  try {
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

    const config = await prisma.tradingConfig.findUnique({
      where: { userId: user.id },
    })

    const response: ApiResponse = {
      success: true,
      data: config || {
        autoTradingEnabled: false,
        washTradingProtection: true,
        maxOrdersPerHour: 50,
        randomDelays: true,
        userAgentRotation: true,
        requestFingerprinting: true,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get trading config error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const configData = await req.json()

    const config = await prisma.tradingConfig.upsert({
      where: { userId: user.id },
      update: configData,
      create: {
        userId: user.id,
        ...configData,
      },
    })

    const response: ApiResponse = {
      success: true,
      data: config,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Update trading config error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
