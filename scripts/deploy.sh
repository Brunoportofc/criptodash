#!/bin/bash

# AGD Trading Dashboard Deployment Script

set -e

echo "🚀 Starting AGD Trading Dashboard deployment..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t agd-trading-dashboard .

# Run database migrations
echo "🗃️ Running database migrations..."
docker-compose run --rm app npx prisma migrate deploy

# Generate Prisma client
echo "⚙️ Generating Prisma client..."
docker-compose run --rm app npx prisma generate

# Start services
echo "🔧 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health check
echo "🔍 Performing health check..."
curl -f http://localhost:3000/api/health || exit 1

echo "✅ Deployment completed successfully!"
echo "🌐 Application is running at: http://localhost:3000"
echo "📊 Database is running at: localhost:5432"
echo "🔄 Redis is running at: localhost:6379"
