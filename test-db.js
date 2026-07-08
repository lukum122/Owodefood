import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  console.log('Attempting to connect to PostgreSQL at:', process.env.DATABASE_URL);
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Failed to connect:', err);
    process.exit(1);
  }
}

testConnection();
