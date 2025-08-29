#!/usr/bin/env node

import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"
import chalk from "chalk"

const prisma = new PrismaClient()

const log = {
  info: (msg) => {
    console.log(chalk.blue("ℹ️"), msg)
  },
  success: (msg) => {
    console.log(chalk.green("✅"), msg)
  },
  error: (msg) => {
    console.log(chalk.red("❌"), msg)
  },
  warning: (msg) => {
    console.log(chalk.yellow("⚠️"), msg)
  },
}

async function seedDatabase() {
  try {
    log.info("🌱 Seeding AGD Trading Dashboard database...")

    // Create demo user
    const demoUser = await prisma.user.upsert({
      where: { email: "demo@agdtrading.com" },
      update: {},
      create: {
        email: "demo@agdtrading.com",
        name: "Demo User",
        image: "/placeholder.svg?height=40&width=40",
        has2FA: true,
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
        backupCodes: JSON.stringify(["ABC123DEF456", "GHI789JKL012", "MNO345PQR678", "STU901VWX234", "YZA567BCD890"]),
      },
    })

    log.success(`Created demo user: ${demoUser.email}`)

    // Create demo MEXC accounts
    const mexcAccounts = [
      {
        accountName: "MEXC Account #1",
        apiKey: "mx0aBYs33eIilxBWC5***",
        apiSecret: "encrypted_secret_1",
        tokenPair: "AGD/USDT",
        status: "active",
        balance: 1250.0,
        vpnLocation: "Singapore",
        vpnStatus: "connected",
      },
      {
        accountName: "MEXC Account #2",
        apiKey: "mx1cDfg44fJjmxCWD6***",
        apiSecret: "encrypted_secret_2",
        tokenPair: "AGD/USDT",
        status: "active",
        balance: 2100.5,
        vpnLocation: "Japan",
        vpnStatus: "connected",
      },
      {
        accountName: "MEXC Account #3",
        apiKey: "mx2eHij55gKknyCXE7***",
        apiSecret: "encrypted_secret_3",
        tokenPair: "AGD/USDT",
        status: "inactive",
        balance: 850.75,
        vpnLocation: "Hong Kong",
        vpnStatus: "disconnected",
      },
    ]

    for (const account of mexcAccounts) {
      const createdAccount = await prisma.mexcAccount.create({
        data: {
          ...account,
          userId: demoUser.id,
        },
      })
      log.success(`Created MEXC account: ${createdAccount.accountName}`)
    }

    // Create trading configuration
    const tradingConfig = await prisma.tradingConfig.upsert({
      where: { userId: demoUser.id },
      update: {},
      create: {
        userId: demoUser.id,
        autoTradingEnabled: true,
        washTradingProtection: true,
        maxOrdersPerHour: 50,
        randomDelays: true,
        userAgentRotation: true,
        requestFingerprinting: true,
      },
    })

    log.success("Created trading configuration")

    // Create VPN configuration
    const vpnConfig = await prisma.vPNConfig.upsert({
      where: { userId: demoUser.id },
      update: {},
      create: {
        userId: demoUser.id,
        provider: "nordvpn",
        autoRotate: true,
        rotationInterval: 30,
        currentLocation: "Singapore",
      },
    })

    log.success("Created VPN configuration")

    // Create sample orders
    const accounts = await prisma.mexcAccount.findMany({
      where: { userId: demoUser.id },
    })

    const sampleOrders = [
      // AGD/USDT orders
      {
        symbol: "AGDUSDT",
        side: "buy",
        type: "limit",
        quantity: 1000,
        price: 0.025,
        status: "filled",
      },
      {
        symbol: "AGDUSDT",
        side: "sell",
        type: "limit",
        quantity: 500,
        price: 0.0255,
        status: "pending",
      },
      {
        symbol: "AGDUSDT",
        side: "buy",
        type: "market",
        quantity: 2000,
        price: 0.0248,
        status: "canceled",
      },
      // SOL/USDT orders
      {
        symbol: "SOLUSDT",
        side: "buy",
        type: "limit",
        quantity: 5.0,
        price: 145.50,
        status: "filled",
      },
      {
        symbol: "SOLUSDT",
        side: "sell",
        type: "limit",
        quantity: 2.5,
        price: 148.75,
        status: "pending",
      },
      {
        symbol: "SOLUSDT",
        side: "buy",
        type: "market",
        quantity: 10.0,
        price: 144.20,
        status: "filled",
      },
      // USDT/BRL orders
      {
        symbol: "USDTBRL",
        side: "buy",
        type: "limit",
        quantity: 100.0,
        price: 5.45,
        status: "filled",
      },
      {
        symbol: "USDTBRL",
        side: "sell",
        type: "limit",
        quantity: 200.0,
        price: 5.52,
        status: "pending",
      },
    ]

    for (const order of sampleOrders) {
      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)]
      const createdOrder = await prisma.order.create({
        data: {
          ...order,
          accountId: randomAccount.id,
          mexcOrderId: randomBytes(8).toString("hex"),
        },
      })
      log.success(`Created sample order: ${createdOrder.side} ${createdOrder.quantity} ${createdOrder.symbol}`)
    }

    // Create audit logs
    const auditLogs = [
      {
        action: "LOGIN",
        resource: "AUTH",
        details: "User logged in successfully",
        ipAddress: "192.168.1.100",
      },
      {
        action: "CREATE_ORDER",
        resource: "TRADING",
        details: "Buy order created for AGD/USDT",
        ipAddress: "192.168.1.100",
      },
      {
        action: "CANCEL_ORDER",
        resource: "TRADING",
        details: "Order canceled by user",
        ipAddress: "192.168.1.100",
      },
    ]

    for (const logEntry of auditLogs) {
      await prisma.auditLog.create({
        data: {
          ...logEntry,
          userId: demoUser.id,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
    }

    log.success("Created audit logs")

    log.success("✅ Database seeded successfully!")

    console.log(chalk.cyan("\n📋 Demo Credentials:"))
    console.log(`Email: ${demoUser.email}`)
    console.log("Password: Use Google OAuth")
    console.log("2FA Secret: JBSWY3DPEHPK3PXP")
  } catch (error) {
    log.error("Seeding failed!")
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run seeding
seedDatabase()
