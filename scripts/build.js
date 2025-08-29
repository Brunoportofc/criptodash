#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const chalk = require("chalk")

console.log(chalk.blue("ℹ️ 🏗️ Building AGD Trading Dashboard for production..."))

// Check if we're in Vercel environment
const isVercel = process.env.VERCEL === "1"
const isProduction = process.env.NODE_ENV === "production"

try {
  // In Vercel or production, skip .env check and use Next.js build directly
  if (isVercel || isProduction) {
    console.log(chalk.yellow("🔧 Production environment detected, using Next.js build..."))

    // Generate Prisma client if schema exists
    if (fs.existsSync("prisma/schema.prisma")) {
      console.log(chalk.blue("📦 Generating Prisma client..."))
      execSync("npx prisma generate", { stdio: "inherit" })
    }

    // Run Next.js build
    console.log(chalk.blue("🏗️ Building Next.js application..."))
    execSync("npx next build", { stdio: "inherit" })

    console.log(chalk.green("✅ Build completed successfully!"))
    process.exit(0)
  }

  // Development environment checks
  const envPath = path.join(process.cwd(), ".env")
  if (!fs.existsSync(envPath)) {
    console.log(chalk.red("❌ .env file not found! Please run setup first."))
    console.log(chalk.yellow("💡 Run: npm run setup"))
    process.exit(1)
  }

  // Check for required environment variables
  require("dotenv").config()

  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"]

  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.log(chalk.red("❌ Missing required environment variables:"))
    missingVars.forEach((varName) => {
      console.log(chalk.red(`   - ${varName}`))
    })
    console.log(chalk.yellow("💡 Please check your .env file"))
    process.exit(1)
  }

  // Generate Prisma client
  console.log(chalk.blue("📦 Generating Prisma client..."))
  execSync("npx prisma generate", { stdio: "inherit" })

  // Run database migrations in development
  if (process.env.NODE_ENV !== "production") {
    console.log(chalk.blue("🗄️ Running database migrations..."))
    execSync("npx prisma db push", { stdio: "inherit" })
  }

  // Build the application
  console.log(chalk.blue("🏗️ Building Next.js application..."))
  execSync("npx next build", { stdio: "inherit" })

  console.log(chalk.green("✅ Build completed successfully!"))
  console.log(chalk.blue("🚀 Ready for deployment!"))
} catch (error) {
  console.log(chalk.red("❌ Build failed:"))
  console.log(chalk.red(error.message))
  process.exit(1)
}
