#!/bin/bash

# AGD Trading Dashboard Setup Script

set -e

echo "🔧 Setting up AGD Trading Dashboard..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agd_trading"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Encryption
ENCRYPTION_SECRET="$(openssl rand -base64 32)"

# Redis
REDIS_URL="redis://localhost:6379"

# Environment
NODE_ENV="development"
EOL
    echo "✅ .env file created. Please update with your actual credentials."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "⚙️ Generating Prisma client..."
npx prisma generate

# Start database
echo "🗃️ Starting database..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev

echo "✅ Setup completed successfully!"
echo "🚀 Run 'npm run dev' to start the development server"
