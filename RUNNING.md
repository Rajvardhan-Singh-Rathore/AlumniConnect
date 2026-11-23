# Running AlumniConnect

1. `bun install` (repo root)
2. Env files (copy the `.env.example` in each app):
   - `apps/backend/.env`   → `DATABASE_URL`, `JWT_PASSWORD`, `PORT=4000`, `ADMIN_SIGNUP_KEY`, `CORS_ORIGIN`
   - `apps/websocket/.env` → `DATABASE_URL`, `JWT_PASSWORD` (same value as backend), `WS_PORT=3001`
   - `packages/db/.env`    → `DATABASE_URL` (Postgres)
3. Create tables: `cd packages/db && bunx prisma contract emit` then apply the migration (see packages/db/README).
4. Start (3 terminals): `cd apps/backend && bun index.ts` · `cd apps/websocket && bun index.ts` · `cd apps/frontend && bun dev`
5. Open http://localhost:3000 → Sign up as **Admin** first (no key needed while no admin exists), approve students/alumni from *Approvals*.

Rules enforced on the server: 1:1 chat only alumni↔alumni; groups are created by alumni/admins; students can read groups but cannot post.
