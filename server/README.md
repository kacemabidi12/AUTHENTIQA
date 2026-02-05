# Authentiqa Server

Minimal Express + Mongoose server for Authentiqa dashboard.

Setup

1. Copy `.env.example` to `.env` and configure `MONGODB_URI` and `JWT_SECRET`.
2. Install dependencies:

   ```bash
   cd server
   npm install
   ```

3. Run in development (auto-restart with nodemon):

   ```bash
   npm run dev
   ```

The server exposes:
- GET /api/ping — quick health check
- POST /api/auth/register — register { name, email, password }
- POST /api/auth/login — login { email, password }

Default port: 5000 (configurable with PORT)
