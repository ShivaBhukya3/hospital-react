/**
 * seed.js — Populate demo users with proper bcrypt hashes
 * Run once after schema.sql:  node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./config/db');

const DEMOS = [
  { username: 'admin',     password: 'admin123',    role: 'admin',        email: 'admin@meridian.in',    phone: '9000000001' },
  { username: 'analyst1',  password: 'analyst123',  role: 'analyst',      email: 'analyst@meridian.in',  phone: '9000000002' },
  { username: 'recept1',   password: 'recept123',   role: 'receptionist', email: 'recept@meridian.in',   phone: '9000000003' },
  { username: 'dr.sharma', password: 'doc123',      role: 'doctor',       email: 'sharma@meridian.in',   phone: '9000000004' },
  { username: 'dr.patel',  password: 'doc123',      role: 'doctor',       email: 'patel@meridian.in',    phone: '9000000005' },
  { username: 'patient1',  password: 'pass123',     role: 'patient',      email: 'patient1@example.com', phone: '9100000010' },
  { username: 'patient2',  password: 'pass123',     role: 'patient',      email: 'patient2@example.com', phone: '9100000011' },
];

async function seed() {
  console.log('Seeding demo users...\n');
  for (const d of DEMOS) {
    const hash = await bcrypt.hash(d.password, 10);
    await query(
      `INSERT INTO users (username, passwordHash, role, email, phone)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash)`,
      [d.username, hash, d.role, d.email, d.phone]
    );
    console.log(`  ✓  ${d.role.padEnd(14)} ${d.username} / ${d.password}`);
  }

  // Link dr.sharma and dr.patel to existing doctor rows if they exist
  const [users] = await query('SELECT userId, username FROM users WHERE username IN (?, ?)', ['dr.sharma', 'dr.patel']).catch(() => [[]]);
  if (Array.isArray(users)) {
    for (const u of users) {
      const doctorName = u.username === 'dr.sharma' ? 'Dr. Ravi Sharma' : 'Dr. Anita Patel';
      await query('UPDATE doctors SET userId = ? WHERE name = ?', [u.userId, doctorName]).catch(() => {});
    }
  }

  // Link patient users to patient records
  const [patUsers] = await query("SELECT userId, username FROM users WHERE username IN ('patient1','patient2')").catch(() => [[]]);
  if (Array.isArray(patUsers)) {
    const names = { patient1: 'Rahul Verma', patient2: 'Priya Singh' };
    for (const u of patUsers) {
      await query('UPDATE patients SET userId = ? WHERE name = ?', [u.userId, names[u.username]]).catch(() => {});
    }
  }

  console.log('\nSeed complete. Start the backend with: npm run dev\n');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
