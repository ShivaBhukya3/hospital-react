# MedCare – Local Setup (Windows)

The project is split into three pieces:

```
hospital-react/
├── database/        # MySQL schema + seed data
├── backend/         # Node.js + Express REST API   (port 4000)
└── frontend/        # React + Vite SPA             (port 5173)
```

You will need three things installed on Windows:
1. **Node.js 18+** — https://nodejs.org/ (includes npm)
2. **MySQL 8+** (or MariaDB 10.6+) — https://dev.mysql.com/downloads/installer/
3. A terminal — PowerShell or Windows Terminal works.

---

## 1. Database

Open **MySQL Command Line Client** (or any SQL client) and run:

```sql
SOURCE C:/Users/shiva/OneDrive/Documents/hospital-react/database/schema.sql;
```

That single file creates `hospital_db`, every table, and seeds the demo users / doctors / patients / appointments. The demo passwords are real bcrypt hashes — see "Demo accounts" below.

If you prefer the shell:

```powershell
mysql -u root -p < C:\Users\shiva\OneDrive\Documents\hospital-react\database\schema.sql
```

---

## 2. Backend (API on http://localhost:4000)

```powershell
cd C:\Users\shiva\OneDrive\Documents\hospital-react\backend
npm install
```

Open `backend\.env` and set your MySQL password:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=YOUR_REAL_MYSQL_PASSWORD   # <-- change this
DB_NAME=hospital_db
JWT_SECRET=any_long_random_string_at_least_32_chars
PORT=4000
FRONTEND_URL=http://localhost:5173
```

Start the server:

```powershell
npm run dev
```

You should see `🏥  Hospital API  →  http://localhost:4000`. Sanity-check it:

```powershell
curl http://localhost:4000/health
# {"status":"ok","timestamp":"..."}
```

---

## 3. Frontend (UI on http://localhost:5173)

In a **second terminal**:

```powershell
cd C:\Users\shiva\OneDrive\Documents\hospital-react\frontend
npm install
npm run dev
```

Vite will print a local URL — open http://localhost:5173 in your browser. The Vite dev server proxies `/api/*` to the backend on :4000 (configured in `vite.config.js`), so no CORS work is needed.

---

## Demo accounts

The login page has a row of "demo pills" — click one and Sign In. All passwords match the seed data:

| Username   | Password    | Role         |
|------------|-------------|--------------|
| admin      | admin123    | admin        |
| analyst1   | analyst123  | analyst      |
| recept1    | recept123   | receptionist |
| dr.sharma  | doc123      | doctor       |
| dr.patel   | doc123      | doctor       |
| patient1   | pass123     | patient      |
| patient2   | pass123     | patient      |

You can also use the Register tab to create a new patient account.

---

## Troubleshooting

- **`ER_ACCESS_DENIED_ERROR`** — the password in `backend\.env` doesn't match your MySQL root password.
- **`ECONNREFUSED 127.0.0.1:3306`** — MySQL service isn't running. Start it from Services (`services.msc`) → MySQL80 → Start.
- **Login fails with "Invalid credentials"** — you skipped step 1 or loaded an older schema. Re-run `database\schema.sql`.
- **Frontend says "Login failed. Try a demo account."** — backend isn't running, so the app falls into demo-fallback mode. Start the backend (step 2).
- **Port already in use** — change `PORT` in `.env` (backend) or pass `--port 5174` to `npm run dev` (frontend), and update the proxy target in `vite.config.js` if you change the backend port.
