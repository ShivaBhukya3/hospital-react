-- ============================================================
--  Hospital Appointment & Analytics System
--  Database: PostgreSQL (Supabase)
--  Run this in the Supabase SQL Editor
-- ============================================================

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  userid        SERIAL PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  passwordhash  VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('patient','receptionist','doctor','admin','analyst')),
  email         VARCHAR(150),
  phone         VARCHAR(20),
  createdat     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── DEPARTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  deptid   SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  floor    VARCHAR(20),
  headdoc  INT DEFAULT NULL
);

-- ── DOCTORS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  doctorid       SERIAL PRIMARY KEY,
  userid         INT DEFAULT NULL REFERENCES users(userid) ON DELETE SET NULL,
  name           VARCHAR(150) NOT NULL,
  department     VARCHAR(100),
  deptid         INT DEFAULT NULL REFERENCES departments(deptid) ON DELETE SET NULL,
  specialization VARCHAR(100),
  availability   VARCHAR(20) DEFAULT 'Available' CHECK (availability IN ('Available','Busy','Off-duty')),
  maxpatients    INT DEFAULT 20,
  createdat      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (headdoc) REFERENCES doctors(doctorid) ON DELETE SET NULL;

-- ── PATIENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  patientid  SERIAL PRIMARY KEY,
  userid     INT DEFAULT NULL REFERENCES users(userid) ON DELETE SET NULL,
  name       VARCHAR(150) NOT NULL,
  age        INT,
  gender     VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
  contact    VARCHAR(20),
  address    TEXT,
  bloodgroup VARCHAR(5),
  emr        TEXT,
  createdat  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── APPOINTMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  appointmentid      SERIAL PRIMARY KEY,
  patientid          INT NOT NULL REFERENCES patients(patientid) ON DELETE CASCADE,
  doctorid           INT NOT NULL REFERENCES doctors(doctorid)   ON DELETE CASCADE,
  appointmentdate    DATE NOT NULL,
  appointmenttime    TIME NOT NULL,
  reason             TEXT,
  status             VARCHAR(20) DEFAULT 'Scheduled'
                       CHECK (status IN ('Pending','Scheduled','Checked-In','In-Progress','Completed','Cancelled')),
  bookedby           VARCHAR(20) DEFAULT 'patient'
                       CHECK (bookedby IN ('patient','receptionist','admin')),
  forwardedtodoctor  SMALLINT DEFAULT 0,
  doctornote         VARCHAR(500) DEFAULT NULL,
  createdat          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appt_date   ON appointments(appointmentdate);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctorid);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patientid);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments(status);

-- ── ATTENDANCE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  attendanceid          SERIAL PRIMARY KEY,
  appointmentid         INT NOT NULL UNIQUE REFERENCES appointments(appointmentid) ON DELETE CASCADE,
  checkintime           TIMESTAMP DEFAULT NULL,
  consultationstarttime TIMESTAMP DEFAULT NULL,
  consultationendtime   TIMESTAMP DEFAULT NULL,
  notes                 TEXT
);

CREATE OR REPLACE VIEW v_attendance AS
  SELECT *,
    EXTRACT(EPOCH FROM (consultationstarttime - checkintime))          / 60 AS waitminutes,
    EXTRACT(EPOCH FROM (consultationendtime   - consultationstarttime)) / 60 AS durationminutes
  FROM attendance;

-- ── ANALYTICS SNAPSHOTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  snapshotid     SERIAL PRIMARY KEY,
  snapshotdate   DATE NOT NULL UNIQUE,
  totalappts     INT DEFAULT 0,
  completedappts INT DEFAULT 0,
  cancelledappts INT DEFAULT 0,
  avgwaitmin     NUMERIC(6,2),
  avgdurationmin NUMERIC(6,2),
  peakhour       SMALLINT,
  deptbreakdown  JSONB,
  createdat      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SEED DATA ────────────────────────────────────────────────
-- Demo passwords:
--   admin / admin123    analyst1 / analyst123    recept1 / recept123
--   dr.sharma / doc123  dr.patel / doc123
--   patient1 / pass123  patient2 / pass123

INSERT INTO users (username, passwordhash, role, email, phone) VALUES
  ('admin',     '$2b$10$RbH9YIy69knxNjfGn59n0OxTMqt9v3nZqfeShPP/DtBHg8cFls1VK', 'admin',        'admin@medcare.com',    '9000000001'),
  ('analyst1',  '$2b$10$6OY0HfFYndMEkNmRqWJ.M.AKxys.VDwqtn2iM9lmX/Xq6XcQO.5by', 'analyst',      'analyst@medcare.com',  '9000000002'),
  ('recept1',   '$2b$10$h.Q7KwbC3FGz6jGMoIbvoeDPx2bgIxRgOsMKrSRjzYXBi.3LxIDDa', 'receptionist', 'recept@medcare.com',   '9000000003'),
  ('dr.sharma', '$2b$10$F2iMTnZ8ekm8XMlnpcja3eLH7bNrSFUFxaZtgDyqyc9Dxhf4MmCmW', 'doctor',       'sharma@medcare.com',   '9000000004'),
  ('dr.patel',  '$2b$10$Is0dDGTpaP5zVtomXLB40uWTgx/lx.DSyHLJDkjeWhKH4rzsQh6BG', 'doctor',       'patel@medcare.com',    '9000000005'),
  ('patient1',  '$2b$10$fSfYhj8DQE4LS9nf6zoU/uPkWi6gt4SUGddrSroEy/J./avap8gbW', 'patient',      'patient1@example.com', '9100000010'),
  ('patient2',  '$2b$10$hbxM/ujokkqD4JrDhp3/XeWrNdm0g/eRO.byfASe9HvKtU0t1HYCa', 'patient',      'patient2@example.com', '9100000011');

INSERT INTO departments (name, floor) VALUES
  ('Cardiology',  '3rd Floor'),
  ('Orthopedics', '2nd Floor'),
  ('Neurology',   '4th Floor'),
  ('Pediatrics',  '1st Floor'),
  ('General OPD', 'Ground Floor');

INSERT INTO doctors (userid, name, department, deptid, specialization, availability) VALUES
  (4,    'Dr. Ravi Sharma',  'Cardiology',  1, 'Interventional Cardiology', 'Available'),
  (5,    'Dr. Anita Patel',  'Orthopedics', 2, 'Joint Replacement',         'Available'),
  (NULL, 'Dr. Suresh Mehta', 'Neurology',   3, 'Stroke & Neuro-ICU',        'Busy'),
  (NULL, 'Dr. Kavita Rao',   'Pediatrics',  4, 'Neonatal Care',             'Available');

INSERT INTO patients (userid, name, age, gender, contact, bloodgroup, address) VALUES
  (6,    'Rahul Verma',  34, 'Male',   '9100000010', 'O+',  'Banjara Hills, Hyderabad'),
  (7,    'Priya Singh',  28, 'Female', '9100000011', 'A+',  'Jubilee Hills, Hyderabad'),
  (NULL, 'Arjun Kumar',  45, 'Male',   '9100000012', 'B+',  'Madhapur, Hyderabad'),
  (NULL, 'Sunita Rao',   52, 'Female', '9100000013', 'AB+', 'Kondapur, Hyderabad');

INSERT INTO appointments (patientid, doctorid, appointmentdate, appointmenttime, reason, status, bookedby) VALUES
  (1, 1, CURRENT_DATE,                      '10:00:00', 'Chest pain follow-up',  'Scheduled',   'patient'),
  (2, 2, CURRENT_DATE,                      '11:30:00', 'Knee pain evaluation',  'Checked-In',  'receptionist'),
  (3, 1, CURRENT_DATE,                      '14:00:00', 'ECG review',            'In-Progress', 'receptionist'),
  (4, 2, CURRENT_DATE - INTERVAL '1 day',   '09:00:00', 'X-ray review',          'Completed',   'patient'),
  (1, 3, CURRENT_DATE - INTERVAL '2 days',  '15:00:00', 'Headache evaluation',   'Completed',   'patient'),
  (2, 1, CURRENT_DATE + INTERVAL '2 days',  '10:30:00', 'Cardiac stress test',   'Scheduled',   'receptionist');

INSERT INTO attendance (appointmentid, checkintime, consultationstarttime, consultationendtime) VALUES
  (4, NOW() - INTERVAL '1 day',  NOW() - INTERVAL '23 hours', NOW() - INTERVAL '22 hours'),
  (5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '47 hours', NOW() - INTERVAL '46 hours');
