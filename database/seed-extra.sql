-- ============================================================
--  Extra seed data — run this ONCE in the Supabase SQL Editor
--  after schema.sql has already been applied.
--  Adds more doctors, patients, appointments, and attendance
--  so every page shows realistic populated data.
-- ============================================================

-- ── EXTRA DOCTORS (doctors 5–9) ──────────────────────────────
INSERT INTO doctors (name, department, deptid, specialization, availability) VALUES
  ('Dr. Priya Nair',    'Dermatology', NULL, 'Clinical Dermatology',    'Available'),
  ('Dr. Arun Khanna',   'Emergency',   NULL, 'Emergency Medicine',      'Busy'),
  ('Dr. Sunita Joshi',  'Radiology',   NULL, 'Diagnostic Radiology',    'Available'),
  ('Dr. Vijay Reddy',   'General OPD', 5,    'Family Medicine',         'Available'),
  ('Dr. Meena Sharma',  'Neurology',   3,    'Pediatric Neurology',     'Available');

-- ── EXTRA PATIENTS (patients 5–8) ────────────────────────────
INSERT INTO patients (name, age, gender, contact, bloodgroup, address) VALUES
  ('Deepa Krishnan',   38, 'Female', '9200000001', 'O-',  'Gachibowli, Hyderabad'),
  ('Rajesh Malhotra',  55, 'Male',   '9200000002', 'B-',  'Secunderabad, Hyderabad'),
  ('Pooja Agarwal',    24, 'Female', '9200000003', 'AB-', 'Ameerpet, Hyderabad'),
  ('Kiran Shetty',     42, 'Male',   '9200000004', 'A-',  'HITEC City, Hyderabad');

-- ── EXTRA APPOINTMENTS ────────────────────────────────────────
-- Completed appointments for every doctor so Doctor Reports page has data
-- Scheduled/Checked-In/In-Progress for today to populate the live dashboard

INSERT INTO appointments
  (patientid, doctorid, appointmentdate, appointmenttime, reason, status, bookedby, forwardedtodoctor)
VALUES
  -- Dr. Ravi Sharma (doctorid=1) — 3 completed past visits
  (5, 1, CURRENT_DATE - INTERVAL '3 days', '09:00:00', 'Hypertension review',          'Completed', 'receptionist', 1),
  (6, 1, CURRENT_DATE - INTERVAL '3 days', '10:30:00', 'Chest discomfort follow-up',   'Completed', 'patient',      1),
  (7, 1, CURRENT_DATE - INTERVAL '5 days', '11:00:00', 'Post-angioplasty check',       'Completed', 'receptionist', 1),

  -- Dr. Anita Patel (doctorid=2) — 2 more completed
  (5, 2, CURRENT_DATE - INTERVAL '4 days', '14:00:00', 'Knee arthritis assessment',    'Completed', 'patient',      1),
  (8, 2, CURRENT_DATE - INTERVAL '6 days', '10:30:00', 'Spinal pain evaluation',       'Completed', 'receptionist', 1),

  -- Dr. Suresh Mehta (doctorid=3) — 2 more completed
  (6, 3, CURRENT_DATE - INTERVAL '7 days', '09:30:00', 'Migraine management',          'Completed', 'receptionist', 1),
  (7, 3, CURRENT_DATE - INTERVAL '8 days', '15:30:00', 'EEG interpretation',           'Completed', 'patient',      1),

  -- Dr. Kavita Rao (doctorid=4) — 2 more completed
  (5, 4, CURRENT_DATE - INTERVAL '5 days', '10:00:00', 'Child vaccination schedule',   'Completed', 'receptionist', 1),
  (8, 4, CURRENT_DATE - INTERVAL '9 days', '11:30:00', 'Neonatal assessment',          'Completed', 'patient',      1),

  -- New doctors (5–9) — 1 completed each
  (6, 5, CURRENT_DATE - INTERVAL '4 days', '09:00:00', 'Eczema treatment review',      'Completed', 'patient',      1),
  (7, 6, CURRENT_DATE - INTERVAL '3 days', '16:00:00', 'Trauma follow-up',             'Completed', 'receptionist', 1),
  (8, 7, CURRENT_DATE - INTERVAL '2 days', '10:00:00', 'MRI result review',            'Completed', 'patient',      1),
  (5, 8, CURRENT_DATE - INTERVAL '2 days', '14:30:00', 'General wellness check',       'Completed', 'receptionist', 1),
  (6, 9, CURRENT_DATE - INTERVAL '4 days', '11:00:00', 'Seizure management review',    'Completed', 'patient',      1),

  -- Today: live activity for the dashboard
  (7, 1, CURRENT_DATE, '09:30:00', 'Annual cardiac check',          'Scheduled',   'receptionist', 1),
  (8, 2, CURRENT_DATE, '10:00:00', 'Joint pain follow-up',          'Checked-In',  'patient',      1),
  (5, 3, CURRENT_DATE, '11:00:00', 'Migraine consultation',         'Scheduled',   'receptionist', 1),
  (6, 4, CURRENT_DATE, '14:30:00', 'Child fever evaluation',        'In-Progress', 'receptionist', 1),
  (7, 5, CURRENT_DATE, '09:00:00', 'Acne treatment follow-up',      'Scheduled',   'patient',      1),
  (8, 8, CURRENT_DATE, '15:00:00', 'Hypertension follow-up',        'Scheduled',   'receptionist', 1),

  -- Future scheduled
  (5, 6, CURRENT_DATE + INTERVAL '1 day', '10:00:00', 'Emergency follow-up',        'Scheduled', 'receptionist', 1),
  (6, 7, CURRENT_DATE + INTERVAL '2 days','11:30:00', 'X-ray result consultation',  'Scheduled', 'patient',      1),
  (7, 9, CURRENT_DATE + INTERVAL '3 days','09:00:00', 'Neurology assessment',       'Scheduled', 'receptionist', 1);

-- ── ATTENDANCE for ALL completed appointments ─────────────────
-- Inserts a check-in 10 min early, consult starts on time, ends 25 min later.
-- Uses a subquery so IDs don't need to be hardcoded.

INSERT INTO attendance (appointmentid, checkintime, consultationstarttime, consultationendtime)
SELECT
  a.appointmentid,
  (a.appointmentdate + a.appointmenttime) - INTERVAL '10 minutes',
  (a.appointmentdate + a.appointmenttime),
  (a.appointmentdate + a.appointmenttime) + INTERVAL '25 minutes'
FROM appointments a
WHERE a.status = 'Completed'
  AND a.appointmentid NOT IN (SELECT appointmentid FROM attendance);
