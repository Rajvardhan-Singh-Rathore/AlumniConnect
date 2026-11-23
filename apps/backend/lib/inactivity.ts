import { db } from "db/client";
import { ts } from "./helpers";
import { getLastSeen, getReminded, markReminded, trackingStartedAt } from "./activity";
import { sendMail } from "./mailer";
import { inactiveEmail } from "./emailTemplates";

const DAY = 86_400_000;
const INACTIVE_DAYS = Number(process.env.INACTIVE_DAYS || 60);
const COOLDOWN_DAYS = Number(process.env.REMINDER_COOLDOWN_DAYS || 30);
const MAX_PER_RUN = Number(process.env.MAX_REMINDERS_PER_RUN || 100); // keeps you under free SMTP daily limits

/** Last activity = latest of: signup, last authenticated request, and anything they posted/sent. */
export async function runInactiveCheck(opts: { days?: number; dryRun?: boolean } = {}) {
  const days = opts.days ?? INACTIVE_DAYS;
  const now = Date.now();
  const alumni: any[] = await db.orm.public.User.where({ role: "ALUMNI" }).all();
  if (!alumni.length) return { days, checked: 0, inactive: [] as any[], sent: 0 };

  const last = new Map<string, number>();
  const bump = (id: string, t: number) => { if (t > (last.get(id) || 0)) last.set(id, t); };
  const [msgs, gmsgs, blogs, comments, jobs, events, conns]: any[][] = await Promise.all([
    db.orm.public.Message.all(), db.orm.public.GroupMessage.all(), db.orm.public.Blog.all(),
    db.orm.public.Comment.all(), db.orm.public.Job.all(), db.orm.public.Event.all(), db.orm.public.Connection.all(),
  ]);
  msgs.forEach((r) => bump(r.senderId, ts(r.createdAt)));
  gmsgs.forEach((r) => bump(r.userId, ts(r.sentAt)));
  blogs.forEach((r) => bump(r.postedBy, ts(r.postedAt)));
  comments.forEach((r) => bump(r.userId, ts(r.commentedAt)));
  jobs.forEach((r) => bump(r.postedBy, ts(r.postedAt)));
  events.forEach((r) => bump(r.createdBy, ts(r.createdAt)));
  conns.forEach((r) => bump(r.senderId, ts(r.createdAt)));

  // Activity before we started tracking logins is unknown, so nobody is flagged until `days` after tracking began.
  const floor = trackingStartedAt();
  const inactive = alumni
    .map((u) => ({ u, lastActive: Math.max(ts(u.createdAt), getLastSeen(u.id), last.get(u.id) || 0, floor) }))
    .filter(({ u, lastActive }) => now - lastActive > days * DAY && now - getReminded(u.id) > COOLDOWN_DAYS * DAY);

  let sent = 0;
  const list: any[] = [];
  for (const { u, lastActive } of inactive) {
    list.push({ id: u.id, name: u.name, email: u.email, lastActive: new Date(lastActive).toISOString() });
    if (opts.dryRun || sent >= MAX_PER_RUN) continue;
    const m = inactiveEmail(u.name, days);
    const r = await sendMail(u.email, m.subject, m.html, m.text);
    if (r.sent || (r as any).dev) { markReminded(u.id); sent++; }
    await new Promise((r) => setTimeout(r, 500)); // be gentle with SMTP
  }
  return { days, checked: alumni.length, inactive: list, sent, dryRun: !!opts.dryRun };
}

/** Runs once a day (first run 2 min after boot). Disable with INACTIVE_CHECK_ENABLED=false. */
export function startInactivityScheduler() {
  if (process.env.INACTIVE_CHECK_ENABLED === "false") return;
  const run = () => runInactiveCheck().then((r) => r.sent && console.log(`[inactive] reminders sent: ${r.sent}`)).catch((e) => console.error("[inactive] failed:", e?.message));
  setTimeout(run, 120_000).unref?.();
  setInterval(run, DAY).unref?.();
}
