-- ============================================================
--  Hospital Appointment & Analytics System
--  Database: MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS hospital_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_db;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  userId       INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(100) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role         ENUM('patient','receptionist','doctor','admin','analyst') NOT NULL,
  email        VARCHAR(150),
  phone        VARCHAR(20),
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── DEPARTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  deptId   INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  floor    VARCHAR(20),
  headDoc  INT DEFAULT NULL
) ENGINE=InnoDB;

-- ── DOCTORS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  doctorId       INT AUTO_INCREMENT PRIMARY KEY,
  userId         INT DEFAULT NULL,
  name           VARCHAR(150) NOT NULL,
  department     VARCHAR(100),
  deptId         INT DEFAULT NULL,
  specialization VARCHAR(100),
  availability   ENUM('Available','Busy','Off-duty') DEFAULT 'Available',
  maxPatients    INT DEFAULT 20,
  createdAt      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId)  REFERENCES users(userId)       ON DELETE SET NULL,
  FOREIGN KEY (deptId)  REFERENCES departments(deptId) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (headDoc) REFERENCES doctors(doctorId) ON DELETE SET NULL;

-- ── PATIENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  patientId  INT AUTO_INCREMENT PRIMARY KEY,
  userId     INT DEFAULT NULL,
  name       VARCHAR(150) NOT NULL,
  age        INT,
  gender     ENUM('Male','Female','Other'),
  contact    VARCHAR(20),
  address    TEXT,
  bloodGroup VARCHAR(5),
  emr        TEXT,
  createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── APPOINTMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  appointmentId   INT AUTO_INCREMENT PRIMARY KEY,
  patientId       INT NOT NULL,
  doctorId        INT NOT NULL,
  appointmentDate DATE NOT NULL,
  appointmentTime TIME NOT NULL,
  reason          TEXT,
  status          ENUM('Scheduled','Checked-In','In-Progress','Completed','Cancelled') DEFAULT 'Scheduled',
  bookedBy        ENUM('patient','receptionist','admin') DEFAULT 'patient',
  createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
  FOREIGN KEY (doctorId)  REFERENCES doctors(doctorId)   ON DELETE CASCADE,
  INDEX idx_date   (appointmentDate),
  INDEX idx_doctor (doctorId),
  INDEX idx_patient(patientId),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ── ATTENDANCE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  attendanceId          INT AUTO_INCREMENT PRIMARY KEY,
  appointmentId         INT NOT NULL UNIQUE,
  checkInTime           DATETIME DEFAULT NULL,
  consultationStartTime DATETIME DEFAULT NULL,
  consultationEndTime   DATETIME DEFAULT NULL,
  notes                 TEXT,
  FOREIGN KEY (appointmentId) REFERENCES appointments(appointmentId) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Computed columns as views (MySQL 5.7 compat; use generated cols in 8+)
CREATE OR REPLACE VIEW v_attendance AS
  SELECT *,
    TIMESTAMPDIFF(MINUTE, checkInTime, consultationStartTime)   AS waitMinutes,
    TIMESTAMPDIFF(MINUTE, consultationStartTime, consultationEndTime) AS durationMinutes
  FROM attendance;

-- ── ANALYTICS SNAPSHOTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  snapshotId     INT AUTO_INCREMENT PRIMARY KEY,
  snapshotDate   DATE NOT NULL UNIQUE,
  totalAppts     INT DEFAULT 0,
  completedAppts INT DEFAULT 0,
  cancelledAppts INT DEFAULT 0,
  avgWaitMin     DECIMAL(6,2),
  avgDurationMin DECIMAL(6,2),
  peakHour       TINYINT,
  deptBreakdown  JSON,
  createdAt      DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── SEED DATA ────────────────────────────────────────────────
-- Demo passwords (matching the AuthPage demo pills):
--   admin / admin123    analyst1 / analyst123    recept1 / recept123
--   dr.sharma / doc123  dr.patel / doc123        patient1 / pass123    patient2 / pass123
INSERT INTO users (username, passwordHash, role, email, phone) VALUES
  ('admin',     '$2b$10$RbH9YIy69knxNjfGn59n0OxTMqt9v3nZqfeShPP/DtBHg8cFls1VK', 'admin',        'admin@medcare.com',    '9000000001'),
  ('analyst1',  '$2b$10$6OY0HfFYndMEkNmRqWJ.M.AKxys.VDwqtn2iM9lmX/Xq6XcQO.5by', 'analyst',      'analyst@medcare.com',  '9000000002'),
  ('recept1',   '$2b$10$h.Q7KwbC3FGz6jGMoIbvoeDPx2bgIxRgOsMKrSRjzYXBi.3LxIDDa', 'receptionist', 'recept@medcare.com',   '9000000003'),
  ('dr.sharma', '$2b$10$F2iMTnZ8ekm8XMlnpcja3eLH7bNrSFUFxaZtgDyqyc9Dxhf4MmCmW', 'doctor',       'sharma@medcare.com',   '9000000004'),
  ('dr.patel',  '$2b$10$Is0dDGTpaP5zVtomXLB40uWTgx/lx.DSyHLJDkjeWhKH4rzsQh6BG', 'doctor',       'patel@medcare.com',    '9000000005'),
  ('patient1',  '$2b$10$fSfYhj8DQE4LS9nf6zoU/uPkWi6gt4SUGddrSroEy/J./avap8gbW', 'patient',      'patient1@example.com', '9100000010'),
  ('patient2',  '$2b$10$hbxM/ujokkqD4JrDhp3/XeWrNdm0g/eRO.byfASe9HvKtU0t1HYCa', 'patient',      'patient2@example.com', '9100000011');

INSERT INTO departments (name, floor) VALUES
  ('Cardiology',   '3rd Floor'),
  ('Orthopedics',  '2nd Floor'),
  ('Neurology',    '4th Floor'),
  ('Pediatrics',   '1st Floor'),
  ('General OPD',  'Ground Floor');

INSERT INTO doctors (userId, name, department, deptId, specialization, availability) VALUES
  (4, 'Dr. Ravi Sharma',  'Cardiology',  1, 'Interventional Cardiology', 'Available'),
  (5, 'Dr. Anita Patel',  'Orthopedics', 2, 'Joint Replacement',         'Available'),
  (NULL,'Dr. Suresh Mehta','Neurology',  3, 'Stroke & Neuro-ICU',        'Busy'),
  (NULL,'Dr. Kavita Rao',  'Pediatrics', 4, 'Neonatal Care',             'Available');

INSERT INTO patients (userId, name, age, gender, contact, bloodGroup, address) VALUES
  (6, 'Rahul Verma',   34, 'Male',   '9100000010', 'O+', 'Banjara Hills, Hyderabad'),
  (7, 'Priya Singh',   28, 'Female', '9100000011', 'A+', 'Jubilee Hills, Hyderabad'),
  (NULL,'Arjun Kumar', 45, 'Male',   '9100000012', 'B+', 'Madhapur, Hyderabad'),
  (NULL,'Sunita Rao',  52, 'Female', '9100000013', 'AB+','Kondapur, Hyderabad');

INSERT INTO appointments (patientId, doctorId, appointmentDate, appointmentTime, reason, status, bookedBy) VALUES
  (1, 1, CURDATE(),        '10:00:00', 'Chest pain follow-up',  'Scheduled',    'patient'),
  (2, 2, CURDATE(),        '11:30:00', 'Knee pain evaluation',  'Checked-In',   'receptionist'),
  (3, 1, CURDATE(),        '14:00:00', 'ECG review',            'In-Progress',  'receptionist'),
  (4, 2, DATE_SUB(CURDATE(),INTERVAL 1 DAY), '09:00:00', 'X-ray review', 'Completed', 'patient'),
  (1, 3, DATE_SUB(CURDATE(),INTERVAL 2 DAY), '15:00:00', 'Headache evaluation','Completed','patient'),
  (2, 1, DATE_ADD(CURDATE(),INTERVAL 2 DAY), '10:30:00', 'Cardiac stress test','Scheduled','receptionist');

INSERT INTO attendance (appointmentId, checkInTime, consultationStartTime, consultationEndTime) VALUES
  (4, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 23 HOUR),  DATE_SUB(NOW(), INTERVAL 22 HOUR)),
  (5, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 47 HOUR),  DATE_SUB(NOW(), INTERVAL 46 HOUR));
