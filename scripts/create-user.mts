import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.development.local
dotenv.config({ path: path.join(dirname(__dirname), '.env.development.local') });

const SALT_ROUNDS = 10;

async function createUser(username: string, password: string) {
  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username.toLowerCase()}, ${passwordHash})
    `;
    
    console.log(`User ${username} created successfully`);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await sql.end();
  }
}

// Get username and password from command line arguments
const [,, username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: node --loader ts-node/esm create-user.mts <username> <password>');
  process.exit(1);
}

createUser(username, password);
