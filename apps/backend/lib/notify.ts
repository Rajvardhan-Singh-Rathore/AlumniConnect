import fs from "node:fs";
import path from "node:path";
import { JWT_SECRET } from "./config";

// In-app notifications: JSON file store (no DB migration) + live push through the websocket server.
const FILE = path.join(import.meta.dir, "..", "data", "notifications.json");
const WS_NOTIFY_URL = process.env.WS_INTERNAL_URL || "http://localhost:3001/internal/notify";
const MAX_PER_USER = 50;

export type Notif = { id: string; type: string; title: string; body?: string; link?: string; createdAt: string; read: boolean };
let store: Record<string, Notif[]> = {};
try { store = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {}
let dirty = false;
const flush = () => {
  if (!dirty) return;
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(store)); dirty = false; } catch (e: any) { console.error("[notify] save failed:", e?.message); }
};
setInterval(flush, 5000).unref?.();
process.on("beforeExit", flush);

/** Create a notification for each user (deduped), save it and push it live. Never throws. */
export function notify(userIds: string[], n: { type: string; title: string; body?: string; link?: string }) {
  const items: { userId: string; notification: Notif }[] = [];
  for (const userId of new Set(userIds.filter(Boolean))) {
    const notification: Notif = { id: crypto.randomUUID(), ...n, createdAt: new Date().toISOString(), read: false };
    store[userId] = [notification, ...(store[userId] || [])].slice(0, MAX_PER_USER);
    items.push({ userId, notification });
  }
  if (!items.length) return;
  dirty = true;
  fetch(WS_NOTIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": JWT_SECRET },
    body: JSON.stringify({ items }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {/* websocket server offline: notification is still saved */});
}

export const listFor = (userId: string) => store[userId] || [];
export const markRead = (userId: string, id: string) => { const n = listFor(userId).find((x) => x.id === id); if (n) { n.read = true; dirty = true; } };
export const markAllRead = (userId: string) => { listFor(userId).forEach((n) => (n.read = true)); dirty = true; };
export const clearAll = (userId: string) => { store[userId] = []; dirty = true; };
