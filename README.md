# Elite Ethiopia eService

[![Vercel](https://img.shields.io/badge/Live%20Demo-Vercel-success?style=for-the-badge&logo=vercel)](https://client-tau-ten-71.vercel.app)
[![GitHub](https://img.shields.io/badge/Repository-GitHub-blue?style=for-the-badge&logo=github)](https://github.com/ZekariyasT/eService_finalproject)

> **🌐 Live Deployment:** [https://client-tau-ten-71.vercel.app](https://client-tau-ten-71.vercel.app)

Full-stack marketplace for **clients**, **freelancers**, and **digital product sellers** (branded in the UI as **Elite Ethiopia**). Clients post jobs, hire freelancers, and buy products; freelancers list services, submit proposals, and work under contracts; sellers list digital goods (including full-course file uploads). **Admins** moderate users, disputes, platform settings, and reporting.

This repository is a monorepo:

| Part | Stack | Role |
|------|--------|------|
| `client/` | Next.js 16 (App Router), React 19, Tailwind CSS, Radix UI | Public marketing site, role dashboards, admin panel |
| `backend/` | Express (TypeScript), MySQL (`mysql2`), JWT, optional Google OAuth & Gemini | REST API, auth, persistence, uploads, email, chatbot |

The frontend talks to the API when `NEXT_PUBLIC_API_URL` points at the backend (recommended for full functionality). If that variable is unset, some flows may rely on local Next.js route handlers under `client/app/api/*` instead.

---

## What the system does

1. **Authentication** — Email/password sign-up and login, password reset, optional email verification, optional Google OAuth (`/auth/google/start` → callback on the backend).
2. **Roles** — `client`, `freelancer`, `seller`, `admin`, `super-admin`. Dashboard routes and API middleware enforce role-specific actions.
3. **Jobs & hiring** — Clients create jobs; freelancers browse and submit proposals; clients accept or reject; optional hire invitations; contracts with deliveries, approvals, completion, and feedback.
4. **Services & products** — Freelancers manage service listings; sellers manage digital products, including protected download routes and optional “full course” uploads (files under `backend/uploads/digital-products/`).
5. **Commerce** — Service orders, product purchases, cart flows in the client UI, wallet (top-up, withdraw, transfer), transactions, and platform commission settings (admin).
6. **Engagement** — Direct messaging (including optional attachments), reviews, disputes, notifications, rewards/coins and exchange-rate controls.
7. **Public assistant** — Optional Google Gemini–powered chatbot (`POST /api/chatbot/message`); persona and facts are driven by markdown under `backend/docs/` (see `backend/env.example`).
8. **Contact & admin** — Public contact form; admin views for users, disputes, listings, transactions, contact messages, reports, and platform settings.

Health check: `GET http://localhost:4000/api/health` (when the backend is running on the default port).

---

## Prerequisites

- **Node.js** — Use **v20.17+** or **v22.9+** if possible (some dependencies warn on older 20.x).
- **npm** (ships with Node).
- **MySQL** — Server reachable from the machine running the API; create a database and load the schema (see below).

---

## Database setup

From the project root (adjust user/host as needed):

```bash
mysql -u root -p < backend/database/elite_ethiopia.sql
```

Or from inside `backend/`:

```bash
cd backend
mysql -u root -p < database/elite_ethiopia.sql
```

On first API start, the server runs initialization/migrations (`initDatabase` in `backend/server.ts`). A merged **super-admin** account is seeded only when the `users` table is empty; credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (or legacy `FOUNDER_*` / `SUPPORT_ADMIN_*`) in `backend/.env`. **Change these in production** and treat `backend/env.example` as a template only—never commit real secrets.

---

## Configuration (`backend/.env`)

Copy the template and edit values.

PowerShell (from repo root):

```powershell
Copy-Item backend\env.example backend\.env
```

macOS / Linux:

```bash
cp backend/env.example backend/.env
```

The API always loads **`backend/.env`** (even if you start the process from the repo root). Important groups:

| Area | Variables (examples) | Notes |
|------|----------------------|--------|
| Core | `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET` | `JWT_SECRET` is **required** or the server exits. |
| MySQL | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Must match your schema/database name. |
| Email | `SMTP_*`, `REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN` | If `SMTP_HOST` is empty, real mail is not sent; dev responses may include debug links. |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Redirect URI must match Google Cloud console (e.g. `http://localhost:4000/auth/google/callback`). |
| Chatbot | `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `CHATBOT_*` | Without a key, chatbot endpoints return 503 and the UI degrades gracefully. |
| Admin seed | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SYNC_SEED_ADMIN_PASSWORDS` | See comments in `env.example`. |

Full comments and optional keys: `backend/env.example`.

---

## Development

### Backend

```powershell
cd backend
npm install
npm run dev
```

Default URL: `http://localhost:4000` (set `PORT` in `.env` to change).

### Frontend

```powershell
cd client
npm install
$env:NEXT_PUBLIC_API_URL="http://localhost:4000"
npm run dev
```

Open `http://localhost:3000`. Align `CLIENT_ORIGIN` on the backend with this origin (e.g. `http://localhost:3000`).

**Unix-style shells** can use `export NEXT_PUBLIC_API_URL=http://localhost:4000` instead of `$env:...`.

---

## Production build

### Backend

Compiles TypeScript to `backend/dist/` and runs with Node:

```powershell
cd backend
npm install
npm run build
npm start
```

Ensure `JWT_SECRET`, MySQL settings, and any SMTP/OAuth/Gemini variables are set in `backend/.env` on the host.

### Frontend

```powershell
cd client
npm install
npm run build
npm start
```

For a production deployment, set `NEXT_PUBLIC_API_URL` to your public API URL **at build time** (Next.js bakes public env vars into the client bundle).

---

## Project layout (high level)

```
client/app/          # Next.js routes: (public), dashboard/*, admin/*
client/components/ # UI components, layout, forms
client/lib/          # Auth context, API helpers, utilities
backend/controllers/
backend/routes/      # Mounted at /api (see routes/index.ts)
backend/middlewares/
backend/database/    # elite_ethiopia.sql, schema helpers
backend/docs/        # Chatbot prompt & optional knowledge markdown
backend/uploads/     # Created at runtime for digital product files
```

---

## API surface

All JSON API routes (except Google OAuth entry points on the app root) live under **`/api`**. Examples: `/api/auth/login`, `/api/jobs`, `/api/contracts`, `/api/wallet/me`, `/api/admin/users`. See `backend/routes/index.ts` for the full map.

---

## Scripts reference

| Location | Command | Purpose |
|----------|---------|---------|
| `backend/` | `npm run dev` | `tsx watch server.ts` |
| `backend/` | `npm run build` | `tsc` → `dist/` |
| `backend/` | `npm start` | `node dist/server.js` |
| `backend/` | `npm run init-db` | Database init utility (see `package.json`) |
| `client/` | `npm run dev` | Next.js dev server |
| `client/` | `npm run build` | Production build |
| `client/` | `npm run start` | Serve production build |
| `client/` | `npm run lint` | ESLint |

---

## Security notes

- Rotate any credentials that were ever committed or shared; use strong `JWT_SECRET` and unique DB passwords in production.
- Restrict CORS via `CLIENT_ORIGIN` to your real frontend origin.
- Review admin seed behavior and `SYNC_SEED_ADMIN_PASSWORDS` before deploying.

---

## License / attribution

Add your team’s license and citation here if applicable.
