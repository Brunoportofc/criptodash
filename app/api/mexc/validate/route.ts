import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { MexcValidator } from "@/lib/mexc-validator"
import type { ApiResponse } from "@/types"

export async function POST(req: NextRequest) {
  console.log("🚀 === MEXC VALIDATION API START ===")
  
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
    console.log("📝 Request body parsed:", { 
      hasApiKey: !!body.apiKey, 
      hasApiSecret: !!body.apiSecret,
      apiKeyLength: body.apiKey?.length || 0,
      apiSecretLength: body.apiSecret?.length || 0
    })
    
    const { apiKey, apiSecret } = body

    if (!apiKey || !apiSecret) {
      console.log("❌ Missing credentials:", { hasApiKey: !!apiKey, hasApiSecret: !!apiSecret })
      return NextResponse.json(
        {
          success: false,
          error: "API Key and Secret are required",
        },
        { status: 400 },
      )
    }

    // Validate API key format - MEXC API keys are alphanumeric strings
    console.log("🔍 Validating API Key format:", {
      length: apiKey.length,
      isAlphanumeric: /^[a-zA-Z0-9]+$/.test(apiKey),
      firstChars: apiKey.substring(0, 8),
      lastChars: apiKey.substring(apiKey.length - 4)
    })
    
    // MEXC API keys can vary in length, but should be at least 16 characters and alphanumeric
    if (!apiKey || apiKey.length < 16 || !/^[a-zA-Z0-9]+$/.test(apiKey)) {
      console.log("❌ Invalid API Key format")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API Key format. MEXC API keys should be alphanumeric and at least 16 characters long.",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Validating API Secret format:", {
      length: apiSecret.length,
      isAlphanumeric: /^[a-zA-Z0-9]+$/.test(apiSecret),
      firstChars: apiSecret.substring(0, 8),
      lastChars: apiSecret.substring(apiSecret.length - 4)
    })

    // MEXC API secrets are typically longer than keys, minimum 16 characters
    if (!apiSecret || apiSecret.length < 16 || !/^[a-zA-Z0-9]+$/.test(apiSecret)) {
      console.log("❌ Invalid API Secret format")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API Secret format. MEXC API secrets should be alphanumeric and at least 16 characters long.",
        },
        { status: 400 },
      )
    }

    console.log("✅ API credentials format validation passed")

    console.log("🔍 Starting MEXC credentials validation...")
    console.log(`📝 API Key format: ${apiKey.substring(0, 8)}... (${apiKey.length} chars)`)
    console.log(`🔐 API Secret format: ${apiSecret.substring(0, 8)}... (${apiSecret.length} chars)`)

    const validator = new MexcValidator({
      apiKey,
      apiSecret,
      environment: "production",
    })

    const validationResult = await validator.validateCredentials()

    // Log validation result for debugging
    console.log("🎯 === FINAL VALIDATION RESULT ===")
    console.log("📊 Summary:", {
      isValid: validationResult.isValid,
      permissions: validationResult.permissions,
      canTrade: validationResult.canTrade,
      canWithdraw: validationResult.canWithdraw,
      accountType: validationResult.accountType,
      errorsCount: validationResult.errors.length,
      warningsCount: validationResult.warnings.length,
    })
    
    if (validationResult.errors.length > 0) {
      console.log("❌ Errors found:")
      validationResult.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }
    
    if (validationResult.warnings.length > 0) {
      console.log("⚠️ Warnings found:")
      validationResult.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`)
      })
    }
    
    if (validationResult.balances && validationResult.balances.length > 0) {
      console.log("💰 Account balances:")
      validationResult.balances.forEach(balance => {
        console.log(`   ${balance.asset}: ${balance.free} (locked: ${balance.locked})`)
      })
    }
    
    console.log("🔚 === VALIDATION RESULT END ===\n")

    const response: ApiResponse = {
      success: true,
      data: validationResult,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.log("💥 === MEXC VALIDATION API EXCEPTION ===")
    console.log("🚨 Error type:", error.constructor.name)
    console.log("🚨 Error message:", error.message)
    console.log("📚 Error stack:", error.stack)
    console.log("🔚 === MEXC VALIDATION API ERROR END ===\n")

    // Handle specific MEXC API errors
    let errorMessage = "Failed to validate MEXC credentials"

    if (error.message.includes("Invalid API-key")) {
      errorMessage = "Invalid API Key. Please check your MEXC API key."
    } else if (error.message.includes("Invalid signature")) {
      errorMessage = "Invalid API Secret. Please check your MEXC API secret."
    } else if (error.message.includes("IP not allowed")) {
      errorMessage = "IP address not whitelisted. Please add your IP to MEXC API whitelist."
    } else if (error.message.includes("API-key format invalid")) {
      errorMessage = "API key format is invalid. Please generate a new API key."
    } else if (error.message.includes("Timestamp")) {
      errorMessage = "Server time synchronization issue. Please try again."
    } else if (error.message.includes("timeout")) {
      errorMessage = "Connection timeout. Please check your internet connection and try again."
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
