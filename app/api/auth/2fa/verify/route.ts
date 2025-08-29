import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verify2FAToken } from "@/lib/2fa"
import type { ApiResponse } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { token } = body

    if (!token || token.length !== 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token format. Must be 6 digits.",
        },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found or 2FA not set up",
        },
        { status: 404 },
      )
    }

    const isValid = verify2FAToken(token, user.twoFactorSecret)
    if (!isValid) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "2FA_VERIFY_FAILED",
          resource: "AUTH",
          details: "Invalid 2FA token provided",
          ipAddress: req.headers.get("x-forwarded-for") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 400 },
      )
    }

    // Enable 2FA for user
    await prisma.user.update({
      where: { id: user.id },
      data: { has2FA: true },
    })

    // Log successful 2FA setup
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "2FA_ENABLED",
        resource: "AUTH",
        details: "2FA successfully enabled",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    })

    const response: ApiResponse = {
      success: true,
      message: "2FA verified and enabled successfully",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
