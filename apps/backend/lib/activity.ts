import fs from "node:fs";
import path from "node:path";

// Tiny JSON store (no DB migration needed). Lives in apps/backend/data/notify-state.json (git-ignored).
// NOTE: on hosts with an ephemeral disk this resets on redeploy; move it to a DB table later if needed.
const FILE = path.join(import.meta.dir, "..", "data", "notify-state.json");
type State = { startedAt: string; lastSeen: Record<string, string>; reminded: Record<string, string> };

let state: State = { startedAt: new Date().toISOString(), lastSeen: {}, reminded: {} };
try { state = { ...state, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; } catch {}

let dirty = true;
const flush = () => {
  if (!dirty) return;
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(state)); dirty = false; } catch (e: any) { console.error("[activity] save failed:", e?.message); }
};
setInterval(flush, 60_000).unref?.();
process.on("beforeExit", flush);
flush();

/** Call on login / any authenticated request. Cheap: memory write, disk flush every minute. */
export const touch = (userId: string) => { state.lastSeen[userId] = new Date().toISOString(); dirty = true; };
export const getLastSeen = (userId: string) => (state.lastSeen[userId] ? Date.parse(state.lastSeen[userId]!) : 0);
export const getReminded = (userId: string) => (state.reminded[userId] ? Date.parse(state.reminded[userId]!) : 0);
export const markReminded = (userId: string) => { state.reminded[userId] = new Date().toISOString(); dirty = true; flush(); };
export const trackingStartedAt = () => Date.parse(state.startedAt);
