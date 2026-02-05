# authentiqa-dashboard

This workspace contains a minimal full-stack MERN starter called `authentiqa-dashboard`.

Structure

- `server/` — Node.js + Express API with Mongoose (MongoDB).
- `client/` — React (JavaScript) app using `react-scripts`.

Quickstart

Open two terminals.

1) Server

```bash
cd server
npm install
# copy .env.example to .env and set MONGODB_URI and JWT_SECRET
npm run dev
```

2) Client

```bash
cd client
npm install
npm start
```

Notes

- The server dev script uses `nodemon` and listens on port 5000 by default.
- The client is configured with a proxy to `http://localhost:5000` for API calls.
- Do NOT use TypeScript, Prisma, or SQLite — this is plain JavaScript with MongoDB.

If you want, I can add a top-level script to run both concurrently.
# AUTHENTIQA
ISS Class Project
