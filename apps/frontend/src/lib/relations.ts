import { api } from "./api";
export type Relation = "connected" | "pending" | "declined";
/** userId -> relationship with me, from the three connection endpoints. */
export async function loadRelations(): Promise<Map<string, Relation>> {
  const [a, p, r] = await Promise.all([api("/connection"), api("/connection/pending"), api("/connection/rejected")]);
  const m = new Map<string, Relation>();
  for (const c of r.rejectedRequests || []) if (c.other) m.set(c.other.id, "declined");
  for (const c of p.pendingRequests || []) if (c.other) m.set(c.other.id, "pending");
  for (const c of a.myConnections || []) if (c.other) m.set(c.other.id, "connected");
  return m;
}
