# 🏥 MedCare – Hospital Appointment & Analytics System
**Stack: React · Node.js · Express · MySQL**

---

## 📁 Project Structure

```
hospital-react/
├── database/
│   └── schema.sql                  # MySQL 8 schema + seed data
│
├── backend/                        # Node.js + Express REST API
│   ├── server.js                   # App entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js                   # mysql2 connection pool
│   ├── middleware/
│   │   └── auth.js                 # JWT + role guard
│   └── routes/
│       ├── auth.js                 # POST /login, /register
│       ├── appointments.js         # Full CRUD + status
│       ├── patients.js             # Patient CRUD + EMR
│       ├── doctors.js              # Doctor mgmt + availability
│       ├── attendance.js           # Check-in / consultation timing
│       ├── analytics.js            # 7 analytics endpoints
│       └── departments.js          # Department CRUD
│
└── frontend/                       # React (Vite) SPA
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Root + all role routing
        ├── styles.css              # Full design system
        ├── context/
        │   └── AuthContext.jsx     # Auth state (JWT storage)
        ├── hooks/
        │   └── useApi.js           # Typed API wrapper + demo fallback
        ├── components/
        │   ├── UI.jsx              # StatCard, Modal, Toast, Table, Icons
        │   └── Sidebar.jsx         # Role-aware nav sidebar
        └── pages/
            ├── AuthPage.jsx
            ├── patient/PatientAppointments.jsx
            ├── receptionist/ReceptionDesk.jsx
            ├── doctor/DoctorSchedule.jsx
            └── admin/AdminDashboard.jsx  (also exports AnalyticsDashboard)
```

---

## 🚀 Setup & Run

### 1. MySQL Database

```bash
mysql -u root -p
CREATE DATABASE hospital_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

mysql -u root -p hospital_db < database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # edit DB credentials

# .env contents:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASS=yourpassword
# DB_NAME=hospital_db
# JWT_SECRET=your_long_random_secret
# PORT=4000
# FRONTEND_URL=http://localhost:5173

npm run dev    # nodemon hot-reload
# → http://localhost:4000
```

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

> **Note:** The Vite dev server proxies `/api` → `localhost:4000`. The frontend also has full demo mode with mock data if the backend is offline.

---

## 🔑 Demo Login Credentials

| Role         | Username    | Password   |
|--------------|-------------|------------|
| Admin        | admin       | admin123   |
| Doctor       | dr.sharma   | doc123     |
| Receptionist | recept1     | recept123  |
| Analyst      | analyst1    | analyst123 |
| Patient      | patient1    | pass123    |

---

## 📡 REST API Reference

### Auth
| Method | Endpoint            | Body                                   |
|--------|---------------------|----------------------------------------|
| POST   | `/api/auth/register`| `{username, password, name, email, phone}` |
| POST   | `/api/auth/login`   | `{username, password}`                 |

### Appointments
| Method | Endpoint                           | Auth Roles              |
|--------|------------------------------------|-------------------------|
| GET    | `/api/appointments`                | All (role-filtered)     |
| POST   | `/api/appointments`                | patient, receptionist   |
| PATCH  | `/api/appointments/:id/status`     | All                     |
| DELETE | `/api/appointments/:id`            | patient, receptionist   |

### Patients
| Method | Endpoint          | Auth Roles                    |
|--------|-------------------|-------------------------------|
| GET    | `/api/patients`   | receptionist, admin, doctor   |
| POST   | `/api/patients`   | receptionist, admin           |
| PUT    | `/api/patients/:id`| doctor (EMR), admin, recept  |

### Analytics *(admin + analyst only)*
| Endpoint                      | Description              |
|-------------------------------|--------------------------|
| GET `/api/analytics/summary`  | KPI cards                |
| GET `/api/analytics/daily`    | Daily trend (`?days=30`) |
| GET `/api/analytics/peak-hours`| Hour distribution       |
| GET `/api/analytics/dept-load`| Department workload      |
| GET `/api/analytics/doctor-load`| Doctor workload        |
| GET `/api/analytics/wait-times`| Wait time trend         |
| GET `/api/analytics/forecast` | 7-day moving average     |
| GET `/api/analytics/export`   | Raw CSV data             |

### Attendance
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | `/api/attendance/checkin` | `{appointmentId}`        |
| POST   | `/api/attendance/start`   | `{appointmentId}`        |
| POST   | `/api/attendance/end`     | `{appointmentId, notes}` |

---

## 🗄️ MySQL Schema

| Table                 | Key Columns                                             |
|-----------------------|---------------------------------------------------------|
| `users`               | userId, username, passwordHash, role (ENUM), email      |
| `departments`         | deptId, name, floor, headDoc (FK→doctors)               |
| `doctors`             | doctorId, name, department, deptId, availability (ENUM) |
| `patients`            | patientId, name, age, gender, contact, bloodGroup, emr  |
| `appointments`        | appointmentId, patientId, doctorId, date, time, status  |
| `attendance`          | appointmentId, checkInTime, startTime, endTime, notes   |
| `analytics_snapshots` | snapshotDate, totals, averages, deptBreakdown (JSON)    |

---

## 🎨 Tech Choices

| Layer      | Tech                                 |
|------------|--------------------------------------|
| Frontend   | React 18 · Vite · react-chartjs-2   |
| Backend    | Node.js · Express 4 · JWT · bcrypt   |
| Database   | MySQL 8 via mysql2 (promise pool)    |
| Charts     | Chart.js 4 (Bar, Line, Doughnut)     |
| Auth       | JWT (8h expiry) + role middleware    |
| CSS        | Custom design system (no framework)  |
