import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.development.local
dotenv.config({ path: path.join(dirname(__dirname), '.env.development.local') });

async function runMigration() {
  try {
    // Get all migration files and sort them to ensure order
    const migrationsDir = path.join(dirname(__dirname), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();  // This will sort by filename, so 001_ comes before 002_

    // Run each migration in order
    for (const migrationFile of migrationFiles) {
      console.log(`Running migration: ${migrationFile}`);
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await sql.query(migrationSql);
        console.log(`Successfully completed migration: ${migrationFile}`);
      } catch (error) {
        console.error(`Failed to run migration ${migrationFile}:`, error);
        throw error; // Re-throw to stop further migrations
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
