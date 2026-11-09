# Sweety – Blood Glucose Tracker

A small full-stack app for logging blood glucose readings and viewing daily, month-to-date and monthly reports.

**Stack:** React (Vite) · Node.js + Express · PostgreSQL (plain SQL with `pg`) · JWT auth · Jest + Supertest

## Features

- Sign up, log in, stay logged in after a refresh
- Add, edit and delete readings for four slots a day: morning (fasting), after breakfast, after lunch, after dinner
- Reports: daily, month to date, and last month, each showing count, highest, lowest and average
- Each user sees only their own data

## Setup

You need Node.js 18+ and PostgreSQL running locally.

### 1. Database

```bash
createdb sweety
createdb sweety_test        # used only by the automated tests
psql -d sweety -f server/db/schema.sql
psql -d sweety_test -f server/db/schema.sql
```

### 2. Server

```bash
cd server
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
npm install
npm run dev                 # http://localhost:4000
```

### 3. Client

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server forwards `/api` requests to `localhost:4000`, so start the server first.

### 4. Demo data (optional)

```bash
cd server
npm run seed
```

This creates a demo user with 45 days of readings. Log in with `demo@sweety.app` / `demo12345`. Running it again is safe: it resets the demo user’s data.

### 5. Tests

```bash
cd server
npm test
```

Tests run against the `sweety_test` database, never `sweety`. They refuse to run if the database name doesn't contain "test", because each test clears the tables first. To use a different test database, set `TEST_DATABASE_URL`.

## API

All routes except signup and login need the header `Authorization: Bearer <token>`. Errors come back as `{ "error": "message" }`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account, returns `{ token, user }` |
| POST | `/api/auth/login` | Log in, returns `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/readings?date=YYYY-MM-DD` | List readings (all, or for one date) |
| POST | `/api/readings` | Add `{ date, slot, value }` |
| PUT | `/api/readings/:id` | Edit a reading |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/reports/:type?date=YYYY-MM-DD` | `type` is `daily`, `month-to-date` or `monthly` |

Slots: `morning_fasting`, `after_breakfast`, `after_lunch`, `after_dinner`. Values are whole numbers from 40 to 600 mg/dL.

Status codes: 400 invalid input, 401 not logged in or bad credentials, 404 not found (including other users' readings), 409 duplicate slot or daily limit reached.

## Notes

**Design choices**
- **Rules are enforced twice.** The API validates everything and returns clear messages. The database also has constraints (valid slot, value range, one reading per user, date and slot) as a safety net, so bad data can't get in even if two requests arrive at the same moment.
- **Ownership is enforced in SQL.** Every query filters on `user_id`. Asking for another user's reading returns 404, so it doesn't reveal that the reading exists.
- **Report maths runs in SQL** (`COUNT`, `MAX`, `MIN`, `AVG`). The React app only displays the result.
- **No ORM.** I used plain SQL with `pg` to keep the queries visible and simple.
- **Dates are plain `YYYY-MM-DD` strings.** The `pg` date parser is overridden so a date never shifts by timezone.

**Assumptions**
- "Monthly" means the full previous calendar month relative to the selected date. "Month to date" runs from the 1st of the selected month to the selected date.
- "Today" and the "no future dates" rule use India time (Asia/Kolkata).
- When a day already has 4 readings, the "only 4 readings per day" message takes priority over the "slot already used" message.
- One reading per slot per day. Editing a reading to a slot that's already taken is rejected.

**Trade-offs and what I'd improve with more time**
- The JWT is stored in `localStorage`. That's simple, but a malicious script on the page could read it. An httpOnly cookie would be safer.
- No refresh tokens or password reset. Tokens last 7 days.
- No rate limiting on login.
- The reports show numbers only. A trend chart would help.
- The tests cover the API and validation; the React screens are tested by hand only.