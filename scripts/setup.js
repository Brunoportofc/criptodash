// AGD Trading Dashboard Setup Script
import { writeFileSync, existsSync } from "fs"
import { execSync } from "child_process"
import { randomBytes } from "crypto"
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

function generateSecret() {
  return randomBytes(32).toString("base64")
}

function executeCommand(command, description, silent = false) {
  try {
    if (!silent) log.info(description)
    execSync(command, { stdio: silent ? "pipe" : "inherit" })
    return true
  } catch (error) {
    if (!silent) log.error(`Failed: ${description}`)
    return false
  }
}

async function createEnvFile() {
  if (existsSync(".env")) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: ".env file already exists. Do you want to overwrite it?",
      initial: false,
    })

    if (!overwrite) {
      log.info("Keeping existing .env file")
      return
    }
  }

  log.info("📝 Creating .env file...")

  const questions = [
    {
      type: "text",
      name: "databaseUrl",
      message: "Database URL:",
      initial: "postgresql://user:password@localhost:5432/agd_trading",
    },
    {
      type: "text",
      name: "nextauthUrl",
      message: "NextAuth URL:",
      initial: "http://localhost:3000",
    },
    {
      type: "text",
      name: "googleClientId",
      message: "Google Client ID:",
      initial: "your-google-client-id",
    },
    {
      type: "text",
      name: "googleClientSecret",
      message: "Google Client Secret:",
      initial: "your-google-client-secret",
    },
    {
      type: "select",
      name: "environment",
      message: "Environment:",
      choices: [
        { title: "Development", value: "development" },
        { title: "Production", value: "production" },
        { title: "Staging", value: "staging" },
      ],
      initial: 0,
    },
  ]

  const answers = await prompts(questions)

  const envContent = `# Database
DATABASE_URL="${answers.databaseUrl}"

# NextAuth
NEXTAUTH_URL="${answers.nextauthUrl}"
NEXTAUTH_SECRET="${generateSecret()}"

# Google OAuth
GOOGLE_CLIENT_ID="${answers.googleClientId}"
GOOGLE_CLIENT_SECRET="${answers.googleClientSecret}"

# Encryption
ENCRYPTION_SECRET="${generateSecret()}"

# Redis
REDIS_URL="redis://localhost:6379"

# Environment
NODE_ENV="${answers.environment}"

# Generated on ${new Date().toISOString()}
`

  writeFileSync(".env", envContent)
  log.success(".env file created successfully!")

  if (answers.googleClientId === "your-google-client-id") {
    log.warning("Please update the Google OAuth credentials in .env file")
  }
}

async function checkPrerequisites() {
  log.info("🔍 Checking prerequisites...")

  const checks = [
    { command: "node --version", name: "Node.js" },
    { command: "npm --version", name: "npm" },
    { command: "docker --version", name: "Docker" },
    { command: "docker-compose --version", name: "Docker Compose" },
  ]

  for (const check of checks) {
    if (executeCommand(check.command, `Checking ${check.name}...`, true)) {
      log.success(`${check.name} is installed`)
    } else {
      log.error(`${check.name} is not installed or not in PATH`)
      process.exit(1)
    }
  }
}

async function setup() {
  try {
    log.info("🔧 Setting up AGD Trading Dashboard...")

    // Check prerequisites
    await checkPrerequisites()

    // Create .env file
    await createEnvFile()

    // Install dependencies
    executeCommand("npm install", "📦 Installing dependencies...")

    // Generate Prisma client
    executeCommand("npx prisma generate", "⚙️ Generating Prisma client...")

    // Start database services
    executeCommand("docker-compose up -d postgres redis", "🗃️ Starting database services...")

    // Wait for database to be ready
    log.info("⏳ Waiting for database to be ready...")
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Run database migrations
    const migrationSuccess = executeCommand("npx prisma migrate dev --name init", "🔄 Running database migrations...")

    if (!migrationSuccess) {
      log.warning("Migration failed, trying to push schema...")
      executeCommand("npx prisma db push", "🔄 Pushing database schema...")
    }

    // Seed database (optional)
    const { seedDatabase } = await prompts({
      type: "confirm",
      name: "seedDatabase",
      message: "Do you want to seed the database with sample data?",
      initial: true,
    })

    if (seedDatabase) {
      executeCommand("npx prisma db seed", "🌱 Seeding database...")
    }

    log.success("✅ Setup completed successfully!")
    log.info('🚀 Run "npm run dev" to start the development server')
    log.info('🐳 Run "node scripts/deploy.js" to deploy with Docker')

    // Show next steps
    console.log(chalk.cyan("\n📋 Next Steps:"))
    console.log("1. Update Google OAuth credentials in .env file")
    console.log("2. Configure your MEXC API keys")
    console.log('3. Run "npm run dev" to start development')
    console.log("4. Visit http://localhost:3000 to access the dashboard")
  } catch (error) {
    log.error("Setup failed!")
    console.error(error)
    process.exit(1)
  }
}

// Run setup
setup()
