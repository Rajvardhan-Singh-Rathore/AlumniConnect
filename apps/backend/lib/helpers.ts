import { db } from 'db/client';

export const safeUser = (u: any) =>
  u ? { id: u.id, name: u.name, email: u.email, role: u.role, graduationYear: u.graduationYear } : null;

/** Map<userId, publicUser> for a list of ids (one query). */
export async function usersById(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  const rows: any[] = uniq.length ? await db.orm.public.User.where((u: any) => u.id.in(uniq)).all() : [];
  return new Map<string, any>(rows.map((u) => [u.id, safeUser(u)]));
}
export const ts = (d: any) => new Date(String(d)).getTime() || 0;
