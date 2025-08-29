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
    throw error
  }
}

async function migrate() {
  try {
    log.info("🔄 AGD Trading Dashboard - Database Migration")

    const { action } = await prompts({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { title: "Create new migration", value: "create" },
        { title: "Apply pending migrations", value: "apply" },
        { title: "Reset database", value: "reset" },
        { title: "Generate Prisma client", value: "generate" },
        { title: "View migration status", value: "status" },
        { title: "Seed database", value: "seed" },
      ],
    })

    switch (action) {
      case "create":
        const { migrationName } = await prompts({
          type: "text",
          name: "migrationName",
          message: "Migration name:",
          validate: (value) => (value.length > 0 ? true : "Migration name is required"),
        })

        executeCommand(`npx prisma migrate dev --name ${migrationName}`, `Creating migration: ${migrationName}`)
        break

      case "apply":
        executeCommand("npx prisma migrate deploy", "Applying pending migrations...")
        break

      case "reset":
        const { confirmReset } = await prompts({
          type: "confirm",
          name: "confirmReset",
          message: "Are you sure you want to reset the database? This will delete all data!",
          initial: false,
        })

        if (confirmReset) {
          executeCommand("npx prisma migrate reset --force", "Resetting database...")
        } else {
          log.info("Database reset cancelled")
        }
        break

      case "generate":
        executeCommand("npx prisma generate", "Generating Prisma client...")
        break

      case "status":
        executeCommand("npx prisma migrate status", "Checking migration status...")
        break

      case "seed":
        executeCommand("npx prisma db seed", "Seeding database...")
        break

      default:
        log.error("Invalid action selected")
        process.exit(1)
    }

    log.success("Migration operation completed successfully!")
  } catch (error) {
    log.error("Migration failed!")
    console.error(error)
    process.exit(1)
  }
}

// Run migration
migrate()
