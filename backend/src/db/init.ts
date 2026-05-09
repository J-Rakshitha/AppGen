import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDatabase(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
    await createTables();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
}

async function createTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS apps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      config JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
      table_name VARCHAR(255) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      data JSONB NOT NULL DEFAULT '{}',
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      read BOOLEAN DEFAULT false,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS csv_imports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      table_name VARCHAR(255) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      rows_total INTEGER DEFAULT 0,
      rows_imported INTEGER DEFAULT 0,
      errors JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);

  console.log('✅ Tables ready');
