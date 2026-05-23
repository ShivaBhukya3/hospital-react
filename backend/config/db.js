/**
 * config/db.js  –  MySQL connection pool via mysql2/promise
 *
 * Set in .env:
 *   DB_HOST=localhost
 *   DB_PORT=3306
 *   DB_USER=root
 *   DB_PASS=yourpassword
 *   DB_NAME=hospital_db
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  database:           process.env.DB_NAME     || 'hospital_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  dateStrings:        true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

/**
 * Execute a parameterised query.
 * Returns [rows, fields] – use destructuring: const [rows] = await db.query(...)
 */
async function query(sql, params = []) {
  return pool.execute(sql, params);
}

/**
 * Grab a connection for multi-statement transactions.
 * Always release() in a finally block.
 */
async function getConnection() {
  return pool.getConnection();
}

module.exports = { query, getConnection, pool };
