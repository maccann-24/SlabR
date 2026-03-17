import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

export const db = drizzle(pool, { schema });
export * from './schema.js';
export { eq, and, or, desc, asc, sql, gte, lte, lt, gt, ne, inArray, notInArray, isNull, isNotNull, count } from 'drizzle-orm';
export type DB = typeof db;
