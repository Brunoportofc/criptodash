// AGD Trading Dashboard Start Script
import { spawn } from "child_process"
import { existsSync } from "fs"
import chalk from "chalk"

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

async function startProduction() {
  try {
    log.info("🚀 Starting AGD Trading Dashboard in production mode...")

    // Check if build exists
    if (!existsSync(".next")) {
      log.error("Build not found! Please run 'npm run build' first.")
      process.exit(1)
    }

    // Check if .env exists
    if (!existsSync(".env")) {
      log.error(".env file not found! Please run 'npm run setup' first.")
      process.exit(1)
    }

    // Start database services
    log.info("🗃️ Starting database services...")
    spawn("docker-compose", ["up", "-d", "postgres", "redis"], { stdio: "inherit" })

    // Wait for services
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Run migrations
    log.info("🔄 Running database migrations...")
    spawn("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" })

    // Start Next.js production server
    log.info("🌐 Starting Next.js production server...")
    const prodProcess = spawn("npm", ["start"], { stdio: "inherit" })

    // Handle process termination
    process.on("SIGINT", () => {
      log.info("🛑 Shutting down production server...")
      prodProcess.kill("SIGINT")
      process.exit(0)
    })

    process.on("SIGTERM", () => {
      log.info("🛑 Shutting down production server...")
      prodProcess.kill("SIGTERM")
      process.exit(0)
    })

    prodProcess.on("close", (code) => {
      log.info(`Production server exited with code ${code}`)
      process.exit(code || 0)
    })

    log.success("✅ Production server started successfully!")
    log.info("🌐 Application is running at: http://localhost:3000")
  } catch (error) {
    log.error("Failed to start production server!")
    console.error(error)
    process.exit(1)
  }
}

// Start production
startProduction()
