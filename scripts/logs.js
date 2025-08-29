// AGD Trading Dashboard Logs Script
import { execSync } from "child_process"
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

function executeCommand(command, description) {
  try {
    log.info(description)
    execSync(command, { stdio: "inherit" })
    return true
  } catch (error) {
    log.error(`Failed: ${description}`)
    return false
  }
}

async function viewLogs() {
  try {
    log.info("📋 AGD Trading Dashboard - View Logs")

    const { logType } = await prompts({
      type: "select",
      name: "logType",
      message: "Which logs would you like to view?",
      choices: [
        { title: "All services", value: "all" },
        { title: "Application logs", value: "app" },
        { title: "Database logs", value: "postgres" },
        { title: "Redis logs", value: "redis" },
        { title: "Nginx logs", value: "nginx" },
        { title: "Docker system logs", value: "system" },
      ],
    })

    const { follow } = await prompts({
      type: "confirm",
      name: "follow",
      message: "Follow logs in real-time?",
      initial: true,
    })

    const followFlag = follow ? "-f" : ""

    switch (logType) {
      case "all":
        executeCommand(`docker-compose logs ${followFlag}`, "📋 Viewing all service logs...")
        break

      case "app":
        executeCommand(`docker-compose logs ${followFlag} app`, "📋 Viewing application logs...")
        break

      case "postgres":
        executeCommand(`docker-compose logs ${followFlag} postgres`, "📋 Viewing database logs...")
        break

      case "redis":
        executeCommand(`docker-compose logs ${followFlag} redis`, "📋 Viewing Redis logs...")
        break

      case "nginx":
        executeCommand(`docker-compose logs ${followFlag} nginx`, "📋 Viewing Nginx logs...")
        break

      case "system":
        executeCommand("docker system events", "📋 Viewing Docker system logs...")
        break

      default:
        log.error("Invalid log type selected")
        process.exit(1)
    }
  } catch (error) {
    log.error("Failed to view logs!")
    console.error(error)
    process.exit(1)
  }
}

// View logs
viewLogs()
