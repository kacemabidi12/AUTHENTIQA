# AUTHENTIQA — quick run instructions

Minimal copy-paste commands to get the app running locally. Run blocks in separate terminals as noted.

## Prerequisites
- Node.js (>=16) and npm
- Docker (optional, for local MongoDB) or a running MongoDB instance

## 1) Install dependencies (run in two terminals or sequentially)

Terminal A — server:
```bash
cd /Users/admin/Downloads/AUTHENTIQA/server
npm install
```

Terminal B — client:
```bash
cd /Users/admin/Downloads/AUTHENTIQA/client
npm install
```

## 2) (Optional) Start a local MongoDB with Docker
```bash
cd /Users/admin/Downloads/AUTHENTIQA
docker compose up -d
docker compose ps
```

## 3) Seed the database (one-time)
Run from the repo root. Uses the local DB by default below; change `MONGODB_URI` to your Atlas URI if needed.
```bash
cd /Users/admin/Downloads/AUTHENTIQA
MONGODB_URI="mongodb://127.0.0.1:27017/authentiqa" \
JWT_SECRET="devsecret" \
ADMIN_EMAIL="admin@local" \
ADMIN_PASSWORD="password" \
NODE_ENV=development \
npm run seed
```

## 4) Start the server
Terminal A (server):
```bash
cd /Users/admin/Downloads/AUTHENTIQA/server

# Option 1: start against local MongoDB
MONGODB_URI="mongodb://127.0.0.1:27017/authentiqa" \
JWT_SECRET="devsecret" \
PORT=5001 \
NODE_ENV=development \
npm run start

# Or use the convenience script (same effect)
npm run start:local

# If you prefer Atlas, replace MONGODB_URI with your mongodb+srv://... URI
```

## 5) Start the client
Terminal B (client):
```bash
cd /Users/admin/Downloads/AUTHENTIQA
REACT_APP_API_BASE_URL="http://localhost:5001" \
npm run start:client
```

## 6) Smoke tests (new terminal)
```bash
# health
curl http://localhost:5001/health

# debug (only when NODE_ENV=development)
curl http://localhost:5001/api/debug/status
curl http://localhost:5001/api/debug/users

# login (seeded admin)
curl -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@local","password":"password"}'
```

## Troubleshooting
- If MongoDB Atlas is used, add your machine IP in Atlas → Network Access or temporarily allow 0.0.0.0/0.
- If `npm` complains at the repo root, run `npm install` inside `server` and `client` separately (this repo has per-project package.json files).
- To run MongoDB locally without Docker, install via Homebrew and start the service:
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

## Optional improvements (available on request)
- Add a single `npm run dev` command that starts both client and server in parallel (use `concurrently`).
- Verify Atlas connection string format and provide a connectivity test command.

That's it — these commands will get the server, client and a local MongoDB running for development.
