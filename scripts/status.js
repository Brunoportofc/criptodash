// AGD Trading Dashboard Status Script
import { execSync } from "child_process"
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

function executeCommand(command, silent = false) {
  try {
    const result = execSync(command, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" })
    return { success: true, output: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function checkStatus() {
  try {
    log.info("📊 AGD Trading Dashboard - System Status")

    console.log(chalk.cyan("\n🐳 Docker Services:"))
    executeCommand("docker-compose ps")

    console.log(chalk.cyan("\n🌐 Application Health:"))
    const healthCheck = executeCommand("curl -s http://localhost:3000/api/health", true)
    if (healthCheck.success) {
      try {
        const healthData = JSON.parse(healthCheck.output)
        if (healthData.status === "healthy") {
          log.success("Application is healthy")
          console.log(`   Database: ${healthData.services.database}`)
          console.log(`   API: ${healthData.services.api}`)
        } else {
          log.error("Application is unhealthy")
        }
      } catch {
        log.warning("Could not parse health check response")
      }
    } else {
      log.error("Application is not responding")
    }

    console.log(chalk.cyan("\n💾 Database Status:"))
    const dbCheck = executeCommand("docker-compose exec -T postgres pg_isready", true)
    if (dbCheck.success) {
      log.success("Database is ready")
    } else {
      log.error("Database is not ready")
    }

    console.log(chalk.cyan("\n🔄 Redis Status:"))
    const redisCheck = executeCommand("docker-compose exec -T redis redis-cli ping", true)
    if (redisCheck.success && redisCheck.output.trim() === "PONG") {
      log.success("Redis is responding")
    } else {
      log.error("Redis is not responding")
    }

    console.log(chalk.cyan("\n📈 Resource Usage:"))
    executeCommand("docker stats --no-stream --format 'table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}'")

    console.log(chalk.cyan("\n🔍 Recent Logs (last 10 lines):"))
    executeCommand("docker-compose logs --tail=10")

    console.log(chalk.cyan("\n📋 System Information:"))
    console.log(`   Node.js: ${process.version}`)
    console.log(`   Platform: ${process.platform}`)
    console.log(`   Architecture: ${process.arch}`)
    console.log(`   Memory Usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`)
  } catch (error) {
    log.error("Failed to check status!")
    console.error(error)
    process.exit(1)
  }
}

// Check status
checkStatus()
