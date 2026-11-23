export const timeAgo = (iso: string | Date) => {
  const t = new Date(String(iso)).getTime();
  if (!t) return "";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
};
export const dateTime = (iso: string | Date) =>
  new Date(String(iso)).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export const dateOnly = (iso: string | Date) => new Date(String(iso)).toLocaleDateString([], { dateStyle: "medium" });
// <input type="datetime-local"> value -> ISO string the API expects
export const toIso = (local: string) => new Date(local).toISOString();
export const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : u ? `https://${u}` : "#");
