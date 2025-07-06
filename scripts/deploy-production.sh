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
  
  # Check if psql is available
  if command -v psql &> /dev/null; then
    echo "Using psql to run migration..."
    psql "$DATABASE_URL" -f prisma/migrations-postgresql/001_init.sql
  else
    echo "psql not found. Please run the migration manually:"
    echo "1. Open Supabase Dashboard > SQL Editor"
    echo "2. Copy and paste the contents of: prisma/migrations-postgresql/001_init.sql"
    echo "3. Run the SQL"
  fi
else
  echo "⚠️ Warning: DATABASE_URL does not appear to be PostgreSQL"
fi

echo "✅ Production deployment complete!"
