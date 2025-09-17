
import mysql from 'mysql2/promise';

export async function getPool() {
  if (!global.__POOL) {
    global.__POOL = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });
  }
  return global.__POOL;
}
