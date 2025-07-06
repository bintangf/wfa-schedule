#!/bin/bash

# Production deployment script for PostgreSQL
echo "🚀 Starting production deployment with PostgreSQL..."

# Copy production schema
echo "📋 Using PostgreSQL schema..."
cp prisma/schema.production.prisma prisma/schema.prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations if DATABASE_URL is PostgreSQL
if [[ $DATABASE_URL == postgresql://* ]] || [[ $DATABASE_URL == postgres://* ]]; then
  echo "🗄️ Running PostgreSQL migrations..."
  npx prisma migrate deploy
else
  echo "⚠️ Warning: DATABASE_URL does not appear to be PostgreSQL"
fi

echo "✅ Production deployment complete!"
