import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generate2FASecret, generateQRCode, generateBackupCodes } from "@/lib/2fa"
import type { ApiResponse } from "@/types"

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

    if (user.has2FA) {
      return NextResponse.json({ success: false, error: "2FA already enabled" }, { status: 400 })
    }

    const { secret, qrCode } = generate2FASecret(user.email)
    const qrCodeDataUrl = await generateQRCode(qrCode)
    const backupCodes = generateBackupCodes()

    // Store temporary 2FA data (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        backupCodes: JSON.stringify(backupCodes),
        // Don't enable 2FA until verification
      },
    })

    const response: ApiResponse = {
      success: true,
      data: {
        secret,
        qrCode: qrCodeDataUrl,
        backupCodes,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
