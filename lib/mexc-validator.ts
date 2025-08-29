import { MexcClient } from "./mexc-client"
import { MEXC_CONFIG, type MexcCredentials, type MexcValidationResult } from "./mexc-config"

export class MexcValidator {
  private client: MexcClient

  constructor(credentials: MexcCredentials) {
    console.log(`\n🔧 === MEXC VALIDATOR INITIALIZATION ===`)
    console.log(`📝 Environment: ${credentials.environment || 'not specified'}`)
    console.log(`🔑 API Key length: ${credentials.apiKey?.length || 0}`)
    console.log(`🔐 API Secret length: ${credentials.apiSecret?.length || 0}`)
    console.log(`🔚 === MEXC VALIDATOR INITIALIZED ===\n`)
    
    this.client = new MexcClient(credentials.apiKey, credentials.apiSecret)
  }

  async validateCredentials(): Promise<MexcValidationResult> {
    console.log(`\n🧪 === MEXC CREDENTIALS VALIDATION START ===`)
    
    const result: MexcValidationResult = {
      isValid: false,
      permissions: [],
      accountType: "unknown",
      canTrade: false,
      canWithdraw: false,
      errors: [],
      warnings: [],
    }

    try {
      // Step 1: Test basic connectivity
      console.log("🔍 Step 1/6: Testing MEXC API connectivity...")
      const pingResult = await this.client.testConnection()
      if (!pingResult.success) {
        console.log(`❌ Step 1 failed: ${pingResult.error}`)
        result.errors.push(`Connection failed: ${pingResult.error}`)
        console.log(`🔚 === MEXC VALIDATION FAILED AT STEP 1 ===\n`)
        return result
      }
      console.log("✅ Step 1 passed: MEXC API connection successful")

      // Step 2: Test API key validity
      console.log("🔍 Step 2/6: Validating API credentials...")
      const accountResult = await this.client.getAccount()
      if (!accountResult.success) {
        console.log(`❌ Step 2 failed: ${accountResult.error}`)
        result.errors.push(`Invalid credentials: ${accountResult.error}`)
        console.log(`🔚 === MEXC VALIDATION FAILED AT STEP 2 ===\n`)
        return result
      }
      console.log("✅ Step 2 passed: API credentials valid")

      const accountData = accountResult.data
      console.log(`📋 Account data structure:`, Object.keys(accountData || {}))

      // Step 3: Check account permissions
      console.log("🔍 Step 3/6: Checking account permissions...")
      if (accountData.permissions) {
        result.permissions = accountData.permissions
        result.canTrade = accountData.permissions.includes("SPOT")
        result.canWithdraw = accountData.permissions.includes("WITHDRAWALS")
        console.log(`📋 Found permissions:`, accountData.permissions)
      } else {
        // Fallback: assume basic permissions if not provided
        result.permissions = ["SPOT"]
        result.canTrade = true
        result.canWithdraw = false
        console.log(`⚠️ No permissions field found, assuming basic SPOT permissions`)
      }
      console.log(`✅ Step 3 passed: Trading=${result.canTrade}, Withdrawals=${result.canWithdraw}`)

      // Step 4: Check account type
      console.log("🔍 Step 4/6: Checking account type...")
      result.accountType = accountData.accountType || "SPOT"
      console.log(`✅ Step 4 passed: Account type = ${result.accountType}`)

      // Step 5: Get balances
      console.log("🔍 Step 5/6: Processing account balances...")
      if (accountData.balances) {
        const nonZeroBalances = accountData.balances
          .filter((balance: any) => Number.parseFloat(balance.free) > 0 || Number.parseFloat(balance.locked) > 0)
        
        result.balances = nonZeroBalances.map((balance: any) => ({
          asset: balance.asset,
          free: balance.free,
          locked: balance.locked,
        }))
        
        console.log(`📋 Found ${accountData.balances.length} total balances, ${nonZeroBalances.length} non-zero`)
        console.log(`💰 Non-zero balances:`, result.balances)
      } else {
        console.log(`⚠️ No balances field found in account data`)
      }
      console.log(`✅ Step 5 passed: Balance processing complete`)

      // Step 6: Test trading pairs availability
      console.log("🔍 Step 6/6: Testing trading pairs availability...")
      const testSymbols = ["SOLUSDT", "USDTBRL", "AGDUSDT"]
      
      for (const symbol of testSymbols) {
        try {
          const orderBookResult = await this.client.getOrderBook(symbol)
          if (!orderBookResult.success) {
            console.log(`⚠️ ${symbol} pair not available: ${orderBookResult.error}`)
            result.warnings.push(`${symbol} pair may not be available`)
          } else {
            console.log(`✅ ${symbol} order book accessible`)
          }
        } catch (symbolError) {
          console.log(`⚠️ Could not check ${symbol} availability: ${symbolError.message}`)
          result.warnings.push(`Could not verify ${symbol} pair availability`)
        }
      }
      console.log(`✅ Step 6 passed: Symbol checks complete`)

      // Step 7: Validate required permissions
      console.log("🔍 Step 7/8: Validating required permissions...")
      const missingPermissions = MEXC_CONFIG.REQUIRED_PERMISSIONS.filter((perm) => !result.permissions.includes(perm))

      if (missingPermissions.length > 0) {
        console.log(`⚠️ Missing permissions: ${missingPermissions.join(", ")}`)
        result.warnings.push(`Missing permissions: ${missingPermissions.join(", ")}`)
      } else {
        console.log(`✅ All required permissions present`)
      }
      console.log(`✅ Step 7 passed: Permission validation complete`)

      // Step 8: Check USDT balance for trading
      console.log("🔍 Step 8/8: Checking USDT balance for trading...")
      const usdtBalance = result.balances?.find((b) => b.asset === "USDT")
      if (!usdtBalance || Number.parseFloat(usdtBalance.free) < MEXC_CONFIG.AGD_CONFIG.MIN_NOTIONAL) {
        console.log(`⚠️ Low USDT balance (required: ${MEXC_CONFIG.AGD_CONFIG.MIN_NOTIONAL} USDT)`)
        result.warnings.push(
          `Low USDT balance. Minimum ${MEXC_CONFIG.AGD_CONFIG.MIN_NOTIONAL} USDT required for trading`,
        )
      } else {
        console.log(`✅ Sufficient USDT balance: ${usdtBalance.free}`)
      }
      console.log(`✅ Step 8 passed: Balance check complete`)

      result.isValid = result.errors.length === 0

      console.log("🎉 === MEXC CREDENTIALS VALIDATION SUCCESS ===")
      console.log(`📊 Final validation summary:`)
      console.log(`   🔓 Valid: ${result.isValid}`)
      console.log(`   👤 Account Type: ${result.accountType}`)
      console.log(`   🛡️ Permissions: ${result.permissions.join(', ')}`)
      console.log(`   💹 Can Trade: ${result.canTrade}`)
      console.log(`   💰 Can Withdraw: ${result.canWithdraw}`)
      console.log(`   ⚠️ Warnings: ${result.warnings.length}`)
      if (result.warnings.length > 0) {
        console.log(`   📋 Warning details:`, result.warnings)
      }
      console.log(`🔚 === MEXC VALIDATION COMPLETE ===\n`)

      return result
    } catch (error) {
      console.log(`💥 === MEXC VALIDATION EXCEPTION ===`)
      console.log(`🚨 Error type: ${error.constructor.name}`)
      console.log(`🚨 Error message: ${error.message}`)
      console.log(`📚 Error stack:`, error.stack)
      console.log(`🔚 === MEXC VALIDATION FAILED ===\n`)
      
      result.errors.push(`Validation failed: ${error.message}`)
      return result
    }
  }

  async testOrderPlacement(symbol: string = "SOLUSDT"): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🧪 Testing order placement for ${symbol} (test mode)...`)

      // Get the appropriate config for the symbol
      const config = MEXC_CONFIG.TRADING_PAIRS[symbol] || MEXC_CONFIG.TRADING_PAIRS["SOLUSDT"]
      
      // This would be a test order with very small amount
      // For now, we'll just validate the order parameters
      const testOrder = {
        symbol: symbol,
        side: "BUY" as const,
        type: "LIMIT" as const,
        quantity: config.MIN_QUANTITY,
        price: symbol === "SOLUSDT" ? 1.0 : symbol === "USDTBRL" ? 0.1 : 0.001, // Very low price to avoid accidental execution
      }

      // Validate order parameters without actually placing it
      if (testOrder.quantity < config.MIN_QUANTITY) {
        return { success: false, error: "Quantity below minimum" }
      }

      if (testOrder.price * testOrder.quantity < config.MIN_NOTIONAL) {
        return { success: false, error: "Order value below minimum notional" }
      }

      console.log(`✅ Order parameters validation passed for ${symbol}`)
      return { success: true }
    } catch (error) {
      console.error("❌ Order test failed:", error)
      return { success: false, error: error.message }
    }
  }
}
