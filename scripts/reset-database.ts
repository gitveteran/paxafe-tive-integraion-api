/**
 * Reset database script - Drops all tables and recreates from schema.sql
 * WARNING: This will delete all data!
 * 
 * Usage: npm run db:reset
 */

// Load environment variables FIRST before importing any modules that use them
import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';
import { readFileSync } from 'fs';

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

// Create a direct database connection for migration
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase') || 
       databaseUrl.includes('neon.tech') || 
       databaseUrl.includes('railway') ||
       databaseUrl.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log(`Connecting to database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');
  
  try {
    // Step 1: Drop all tables in correct order (respecting foreign keys)
    console.log('Step 1: Dropping all existing tables...');
    
    await pool.query(`
      DROP TABLE IF EXISTS device_latest CASCADE;
      DROP TABLE IF EXISTS payload_order_tracking CASCADE;
      DROP TABLE IF EXISTS locations CASCADE;
      DROP TABLE IF EXISTS telemetry CASCADE;
      DROP TABLE IF EXISTS raw_webhook_payloads CASCADE;
    `);
    
    console.log('✓ Dropped all tables');

    // Step 2: Read and execute schema.sql
    console.log('\nStep 2: Creating tables from schema.sql...');
    
    const schemaPath = resolve(process.cwd(), 'src/lib/db/schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    // Execute the schema SQL
    await pool.query(schemaSql);
    
    console.log('✓ Created all tables and indexes');

    // Step 3: Verify tables were created
    console.log('\nStep 3: Verifying tables...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log(`✓ Found ${tables.length} tables: ${tables.join(', ')}`);

    console.log('\n✅ Database reset completed successfully!');
    console.log('All tables have been dropped and recreated from schema.sql');
    
  } catch (error) {
    console.error('\n❌ Database reset failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();

