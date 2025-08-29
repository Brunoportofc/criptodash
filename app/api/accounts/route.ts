import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MexcClient } from "@/lib/mexc-client"
import type { ApiResponse } from "@/types"
import { encrypt } from "@/lib/encryption"

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

    const accounts = await prisma.mexcAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        accountName: true,
        apiKey: true, // Masked in response
        tokenPair: true,
        status: true,
        balance: true,
        vpnLocation: true,
        vpnStatus: true,
        lastActivity: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Mask API keys for security
    const maskedAccounts = accounts.map((account) => ({
      ...account,
      apiKey: account.apiKey.substring(0, 10) + "***",
    }))

    const response: ApiResponse = {
      success: true,
      data: maskedAccounts,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get accounts error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  console.log("🚀 === ADD MEXC ACCOUNT START ===")
  
  try {
    const session = await getServerSession(authOptions)
    console.log("👤 Session check:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasEmail: !!session?.user?.email 
    })
    
    if (!session?.user?.email) {
      console.log("❌ Unauthorized: No session or email")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("📦 Parsing request body...")
    const body = await req.json()
    console.log("📝 Request fields:", {
      hasAccountName: !!body.accountName,
      hasApiKey: !!body.apiKey,
      hasApiSecret: !!body.apiSecret,
      hasTokenPair: !!body.tokenPair,
      apiKeyLength: body.apiKey?.length || 0,
      accountNameLength: body.accountName?.length || 0
    })
    
    const { accountName, apiKey, apiSecret, tokenPair, vpnLocation } = body

    // Validation
    console.log("🔍 Validating required fields...")
    if (!accountName || !apiKey || !apiSecret || !tokenPair) {
      console.log("❌ Missing required fields")
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: accountName, apiKey, apiSecret, tokenPair",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Validating API key/secret length...")
    if (apiKey.length < 10 || apiSecret.length < 10) {
      console.log("❌ API key/secret too short")
      return NextResponse.json(
        {
          success: false,
          error: "API key and secret must be at least 10 characters",
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

    // Test MEXC connection before saving
    const mexcClient = new MexcClient(apiKey, apiSecret)
    const connectionTest = await mexcClient.testConnection()

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: `MEXC connection failed: ${connectionTest.error}`,
        },
        { status: 400 },
      )
    }

    // Check for duplicate API key
    console.log("🔍 Checking for duplicate API key...")
    const existingAccount = await prisma.mexcAccount.findFirst({
      where: {
        userId: user.id,
        apiKey: apiKey,
      },
    })

    if (existingAccount) {
      console.log("❌ Duplicate API key found:", {
        existingAccountId: existingAccount.id,
        existingAccountName: existingAccount.accountName,
        attemptedAccountName: accountName
      })
      return NextResponse.json(
        {
          success: false,
          error: "Account with this API key already exists",
        },
        { status: 400 },
      )
    }
    console.log("✅ No duplicate API key found")

    const encryptedApiSecret = encrypt(apiSecret)

    const account = await prisma.mexcAccount.create({
      data: {
        userId: user.id,
        accountName,
        apiKey,
        apiSecret: encryptedApiSecret,
        tokenPair: tokenPair.toUpperCase(),
        vpnLocation: vpnLocation || "Singapore",
        status: "active",
        balance: 0,
        vpnStatus: "connected",
        lastActivity: new Date(),
      },
    })

    // Log account creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_ACCOUNT",
        resource: "MEXC_ACCOUNT",
        details: `Created MEXC account: ${accountName}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    })

    const response: ApiResponse = {
      success: true,
      data: {
        id: account.id,
        accountName: account.accountName,
        apiKey: account.apiKey.substring(0, 10) + "***",
        tokenPair: account.tokenPair,
        status: account.status,
        vpnLocation: account.vpnLocation,
      },
      message: "MEXC account created successfully",
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.log("💥 === ADD MEXC ACCOUNT ERROR ===")
    console.log("🚨 Error type:", error?.constructor?.name)
    console.log("🚨 Error message:", error?.message)
    console.log("📚 Error stack:", error?.stack)
    console.log("🔚 === ADD MEXC ACCOUNT ERROR END ===")
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  console.log("🗑️ === DELETE MEXC ACCOUNT START ===")
  
  try {
    const session = await getServerSession(authOptions)
    console.log("👤 Session check:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasEmail: !!session?.user?.email 
    })
    
    if (!session?.user?.email) {
      console.log("❌ Unauthorized: No session or email")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("📦 Parsing request body...")
    const body = await req.json()
    console.log("📝 Request fields:", {
      hasAccountId: !!body.accountId,
      accountId: body.accountId
    })
    
    const { accountId } = body

    // Validation
    console.log("🔍 Validating required fields...")
    if (!accountId) {
      console.log("❌ Missing account ID")
      return NextResponse.json(
        {
          success: false,
          error: "Account ID is required",
        },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      console.log("❌ User not found")
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Check if account exists and belongs to user
    console.log("🔍 Checking if account exists and belongs to user...")
    const account = await prisma.mexcAccount.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
    })

    if (!account) {
      console.log("❌ Account not found or doesn't belong to user:", {
        accountId,
        userId: user.id
      })
      return NextResponse.json(
        {
          success: false,
          error: "Account not found or you don't have permission to delete it",
        },
        { status: 404 },
      )
    }

    console.log("✅ Account found:", {
      accountId: account.id,
      accountName: account.accountName,
      userId: account.userId
    })

    // Delete the account
    console.log("🗑️ Deleting account...")
    await prisma.mexcAccount.delete({
      where: { id: accountId },
    })

    // Log account deletion
    console.log("📝 Creating audit log...")
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_ACCOUNT",
        resource: "MEXC_ACCOUNT",
        details: `Deleted MEXC account: ${account.accountName} (ID: ${account.id})`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    })

    const response: ApiResponse = {
      success: true,
      data: {
        deletedAccountId: accountId,
        deletedAccountName: account.accountName,
      },
      message: "MEXC account deleted successfully",
    }

    console.log("✅ Account deleted successfully:", {
      accountId,
      accountName: account.accountName
    })
    console.log("🔚 === DELETE MEXC ACCOUNT END ===")

    return NextResponse.json(response)
  } catch (error: any) {
    console.log("💥 === DELETE MEXC ACCOUNT ERROR ===")
    console.log("🚨 Error type:", error?.constructor?.name)
    console.log("🚨 Error message:", error?.message)
    console.log("📚 Error stack:", error?.stack)
    console.log("🔚 === DELETE MEXC ACCOUNT ERROR END ===")
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
