# Looma

EV charging platform — a landing page, a backoffice, and an OCPP 1.6J server in one repo.

## Structure

```
apps/
  landing       Marketing site (Vite + React + Tailwind)
  backoffice    Admin dashboard (Vite + React + Tailwind)
  ocpp-server   OCPP 1.6J WebSocket server (Node + ws)
packages/
  shared        Shared domain types
  db            Supabase client
```

## Getting started

```bash
npm install
npm run dev:landing      # http://localhost:5173
npm run dev:backoffice   # http://localhost:5174
npm run dev:ocpp         # ws://localhost:9000
```

Copy `.env.example` to `.env` and fill in your Supabase credentials.
