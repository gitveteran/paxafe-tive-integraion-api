/**
 * Reset database script - Drops all tables and recreates using Prisma migrations
 * WARNING: This will delete all data!
 * 
 * Usage: npm run db:reset
 * 
 * This script uses Prisma migrate reset which:
 * 1. Drops the database
 * 2. Creates a new database
 * 3. Applies all migrations
 * 4. Runs seed script (if configured)
 */

// Load environment variables FIRST before importing any modules that use them
import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Load .env.local first (takes precedence), then .env
config({ path: resolve(process.cwd(), '.env.local') });
config(); // Also load from .env if it exists

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL in .env.local or as an environment variable');
  process.exit(1);
}

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log(`Connecting to database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');
  
  try {
    console.log('Resetting database using Prisma migrate reset...');
    console.log('This will:');
    console.log('  1. Drop the database');
    console.log('  2. Create a new database');
    console.log('  3. Apply all migrations');
    console.log('');
    
    // Use Prisma migrate reset
    // This command drops the database, recreates it, and applies all migrations
    execSync('npx prisma migrate reset --force', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
    
    console.log('\n✅ Database reset completed successfully!');
    console.log('All tables have been dropped and recreated using Prisma migrations');
    
  } catch (error) {
    console.error('\n❌ Database reset failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

resetDatabase();

