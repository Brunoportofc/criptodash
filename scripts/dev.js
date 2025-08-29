#!/usr/bin/env node

import { spawn } from "child_process"
import { existsSync } from "fs"
import chalk from "chalk"
import prompts from "prompts"

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

async function startDevelopment() {
  try {
    log.info("🚀 Starting AGD Trading Dashboard in development mode...")

    // Check if .env exists
    if (!existsSync(".env")) {
      log.warning(".env file not found!")
      const { runSetup } = await prompts({
        type: "confirm",
        name: "runSetup",
        message: "Would you like to run the setup script first?",
        initial: true,
      })

      if (runSetup) {
        const setupProcess = spawn("node", ["scripts/setup.js"], { stdio: "inherit" })
        await new Promise((resolve, reject) => {
          setupProcess.on("close", (code) => {
            if (code === 0) resolve(code)
            else reject(new Error(`Setup failed with code ${code}`))
          })
        })
      } else {
        log.error("Cannot start without .env file")
        process.exit(1)
      }
    }

    // Check if node_modules exists
    if (!existsSync("node_modules")) {
      log.info("📦 Installing dependencies...")
      const installProcess = spawn("npm", ["install"], { stdio: "inherit" })
      await new Promise((resolve, reject) => {
        installProcess.on("close", (code) => {
          if (code === 0) resolve(code)
          else reject(new Error(`Installation failed with code ${code}`))
        })
      })
    }

    // Start database services
    log.info("🗃️ Starting database services...")
    spawn("docker-compose", ["up", "-d", "postgres", "redis"], { stdio: "inherit" })

    // Wait a bit for services to start
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Generate Prisma client
    log.info("⚙️ Generating Prisma client...")
    spawn("npx", ["prisma", "generate"], { stdio: "inherit" })

    // Start Next.js development server
    log.info("🌐 Starting Next.js development server...")
    const devProcess = spawn("npm", ["run", "dev"], { stdio: "inherit" })

    // Handle process termination
    process.on("SIGINT", () => {
      log.info("🛑 Shutting down development server...")
      devProcess.kill("SIGINT")
      process.exit(0)
    })

    process.on("SIGTERM", () => {
      log.info("🛑 Shutting down development server...")
      devProcess.kill("SIGTERM")
      process.exit(0)
    })

    devProcess.on("close", (code) => {
      log.info(`Development server exited with code ${code}`)
      process.exit(code || 0)
    })
  } catch (error) {
    log.error("Failed to start development server!")
    console.error(error)
    process.exit(1)
  }
}

// Start development
startDevelopment()
