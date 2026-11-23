# Realtime chat – setup
1. `bun install` (root)
2. Copy `apps/backend/.env.example` -> `apps/backend/.env` and `apps/websocket/.env.example` -> `apps/websocket/.env`
   (use the SAME `JWT_PASSWORD` in both; backend also needs your DB env as before)
3. Run (3 terminals):  `cd apps/backend && bun dev` (:4000)  |  `cd apps/websocket && bun dev` (:3001)  |  `cd apps/frontend && bun dev` (:3000)
4. Log in as an alumni in two browsers -> open /chat -> pick the other alumni.
Rules: 1:1 chat = alumni<->alumni only. Group messages = alumni/admin members only; students view only.
