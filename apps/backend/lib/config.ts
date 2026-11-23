import 'dotenv/config';
// Single JWT secret used by REST login, REST auth middleware AND the websocket server.
// Set JWT_PASSWORD in apps/backend/.env and apps/websocket/.env (same value in both).
export const JWT_SECRET = process.env.JWT_PASSWORD || 'dev-only-change-me';
export const PORT = Number(process.env.PORT || 4000);
