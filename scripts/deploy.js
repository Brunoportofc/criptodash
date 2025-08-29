#!/usr/bin/env node

import { execSync } from "child_process"
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

function executeCommand(command, description) {
  try {
    log.info(description)
    execSync(command, { stdio: "inherit" })
    return true
  } catch (error) {
    log.error(`Failed: ${description}`)
    throw error
  }
}

async function healthCheck() {
  const maxRetries = 10
  const retryDelay = 3000

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("http://localhost:3000/api/health")
      if (response.ok) {
        log.success("Health check passed!")
        return true
      }
    } catch (error) {
      log.warning(`Health check attempt ${i + 1}/${maxRetries} failed, retrying...`)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  throw new Error("Health check failed after maximum retries")
}

async function deploy() {
  try {
    log.info("🚀 Starting AGD Trading Dashboard deployment...")

    // Check if Docker is installed
    try {
      execSync("docker --version", { stdio: "pipe" })
    } catch {
      throw new Error("Docker is not installed or not in PATH")
    }

    // Check if docker-compose is installed
    try {
      execSync("docker-compose --version", { stdio: "pipe" })
    } catch {
      throw new Error("Docker Compose is not installed or not in PATH")
    }

    // Check if .env file exists
    if (!existsSync(".env")) {
      log.warning(".env file not found. Please run setup script first.")
      throw new Error("Environment file missing")
    }

    // Build Docker image
    executeCommand("docker build -t agd-trading-dashboard .", "📦 Building Docker image...")

    // Stop existing containers
    try {
      executeCommand("docker-compose down", "🛑 Stopping existing containers...")
    } catch {
      log.warning("No existing containers to stop")
    }

    // Start database and Redis first
    executeCommand("docker-compose up -d postgres redis", "🗃️ Starting database and Redis...")

    // Wait for database to be ready
    log.info("⏳ Waiting for database to be ready...")
    await new Promise((resolve) => setTimeout(resolve, 15000))

    // Run database migrations
    executeCommand("docker-compose run --rm app npx prisma migrate deploy", "🔄 Running database migrations...")

    // Generate Prisma client
    executeCommand("docker-compose run --rm app npx prisma generate", "⚙️ Generating Prisma client...")

    // Start all services
    executeCommand("docker-compose up -d", "🔧 Starting all services...")

    // Wait for services to be ready
    log.info("⏳ Waiting for services to be ready...")
    await new Promise((resolve) => setTimeout(resolve, 30000))

    // Perform health check
    log.info("🔍 Performing health check...")
    await healthCheck()

    log.success("✅ Deployment completed successfully!")
    log.info("🌐 Application is running at: http://localhost:3000")
    log.info("📊 Database is running at: localhost:5432")
    log.info("🔄 Redis is running at: localhost:6379")

    // Show running containers
    log.info("📋 Running containers:")
    execSync("docker-compose ps", { stdio: "inherit" })
  } catch (error) {
    log.error("Deployment failed!")
    console.error(error)
    process.exit(1)
  }
}

// Run deployment
deploy()
