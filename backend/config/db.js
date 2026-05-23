/**
 * config/db.js  –  PostgreSQL connection pool via pg
 * Mimics the mysql2/promise interface so all routes stay unchanged.
 *
 * Set in .env:
 *   DATABASE_URL=postgres://user:pass@host:5432/db   ← Supabase connection string
 *   -- OR individual vars --
 *   DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME / DB_SSL
 */

const { Pool, types } = require('pg');

// Return DATE / TIME / TIMESTAMP as plain strings (same as mysql2's dateStrings:true)
types.setTypeParser(types.builtins.DATE,        v => v);
types.setTypeParser(types.builtins.TIME,        v => v);
types.setTypeParser(types.builtins.TIMESTAMP,   v => v);
types.setTypeParser(types.builtins.TIMESTAMPTZ, v => v);

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST || 'localhost',
        port:     parseInt(process.env.DB_PORT || '5432'),
        user:     process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'hospital_db',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
);

// pg returns all column names in lowercase. Map them back to camelCase so
// all existing route code (`rows[0].userId`, `.appointmentDate`, etc.) keeps working.
const COLUMN_MAP = {
  userid: 'userId', doctorid: 'doctorId', patientid: 'patientId',
  attendanceid: 'attendanceId', appointmentid: 'appointmentId',
  snapshotid: 'snapshotId', deptid: 'deptId', headdoc: 'headDoc',
  passwordhash: 'passwordHash', createdat: 'createdAt',
  bloodgroup: 'bloodGroup', maxpatients: 'maxPatients',
  appointmentdate: 'appointmentDate', appointmenttime: 'appointmentTime',
  bookedby: 'bookedBy', forwardedtodoctor: 'forwardedToDoctor',
  doctornote: 'doctorNote', checkintime: 'checkInTime',
  consultationstarttime: 'consultationStartTime',
  consultationendtime: 'consultationEndTime',
  waitminutes: 'waitMinutes', durationminutes: 'durationMinutes',
  avgwaitmin: 'avgWaitMin', avgdurationmin: 'avgDurationMin',
  avgwait: 'avgWait', maxwait: 'maxWait', movingavg: 'movingAvg',
  useremail: 'userEmail', userphone: 'userPhone',
  patientname: 'patientName', doctorname: 'doctorName',
  headname: 'headName', snapshotdate: 'snapshotDate',
  totalappts: 'totalAppts', completedappts: 'completedAppts',
  cancelledappts: 'cancelledAppts', peakhour: 'peakHour',
  deptbreakdown: 'deptBreakdown',
};

function remapKeys(rows) {
  return rows.map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[COLUMN_MAP[k] || k] = v;
    return out;
  });
}

// Convert MySQL ? placeholders → PostgreSQL $1 $2 …
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function query(sql, params = []) {
  const pgSql  = toPostgres(sql);
  const isInsert  = /^\s*INSERT/i.test(pgSql);
  const isUpdate  = /^\s*(UPDATE|DELETE)/i.test(pgSql);

  // Auto-append RETURNING * so we can expose insertId without touching any route
  const finalSql = isInsert && !/RETURNING/i.test(pgSql)
    ? pgSql + ' RETURNING *'
    : pgSql;

  const result = await pool.query(finalSql, params);

  if (isInsert && result.rows.length) {
    const firstRow = result.rows[0];
    const insertId = Object.values(firstRow)[0];   // first col = primary key
    return [{ insertId, affectedRows: result.rowCount, rows: remapKeys(result.rows) }, []];
  }

  if (isUpdate) {
    return [{ affectedRows: result.rowCount }, []];
  }

  return [remapKeys(result.rows), []];
}

async function getConnection() {
  const client = await pool.connect();
  return {
    query:   (sql, p = []) => query(sql, p),
    execute: (sql, p = []) => query(sql, p),
    release: () => client.release(),
  };
}

module.exports = { query, getConnection, pool };
