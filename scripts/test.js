#!/usr/bin/env node

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

async function runTests() {
  try {
    log.info("🧪 Running AGD Trading Dashboard tests...")

    const { testType } = await prompts({
      type: "select",
      name: "testType",
      message: "What type of tests would you like to run?",
      choices: [
        { title: "All tests", value: "all" },
        { title: "Unit tests", value: "unit" },
        { title: "Integration tests", value: "integration" },
        { title: "E2E tests", value: "e2e" },
        { title: "Type checking", value: "types" },
        { title: "Linting", value: "lint" },
        { title: "Security audit", value: "audit" },
      ],
    })

    let success = true

    switch (testType) {
      case "all":
        success = executeCommand("npm run test", "🧪 Running all tests...")
        success = executeCommand("npx tsc --noEmit", "🔍 Type checking...") && success
        success = executeCommand("npm run lint", "🔍 Linting...") && success
        success = executeCommand("npm audit", "🔒 Security audit...") && success
        break

      case "unit":
        success = executeCommand("npm run test:unit", "🧪 Running unit tests...")
        break

      case "integration":
        success = executeCommand("npm run test:integration", "🧪 Running integration tests...")
        break

      case "e2e":
        success = executeCommand("npm run test:e2e", "🧪 Running E2E tests...")
        break

      case "types":
        success = executeCommand("npx tsc --noEmit", "🔍 Type checking...")
        break

      case "lint":
        success = executeCommand("npm run lint", "🔍 Linting...")
        break

      case "audit":
        success = executeCommand("npm audit", "🔒 Security audit...")
        break

      default:
        log.error("Invalid test type selected")
        process.exit(1)
    }

    if (success) {
      log.success("✅ All tests passed!")
    } else {
      log.error("❌ Some tests failed!")
      process.exit(1)
    }

    // Show test coverage if available
    if (testType === "all" || testType === "unit") {
      const { showCoverage } = await prompts({
        type: "confirm",
        name: "showCoverage",
        message: "Show test coverage report?",
        initial: false,
      })

      if (showCoverage) {
        executeCommand("npm run test:coverage", "📊 Generating coverage report...")
      }
    }
  } catch (error) {
    log.error("Tests failed!")
    console.error(error)
    process.exit(1)
  }
}

// Run tests
runTests()
