import 'dotenv/config';
export const JWT_SECRET = process.env.JWT_PASSWORD || 'dev-only-change-me';
export const WS_PORT = Number(process.env.WS_PORT || 3001);
