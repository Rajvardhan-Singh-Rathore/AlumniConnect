import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
const enabled = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
const port = Number(SMTP_PORT || 587);
const transporter = enabled
  ? nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null;

if (!enabled) console.log("[mail] SMTP not configured -> emails are only printed to this console (set SMTP_* in apps/backend/.env)");

/** Never throws. Returns { sent } so callers can ignore failures (a mail problem must not break signup/approval). */
export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!transporter) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return { sent: false as const, dev: true };
  }
  try {
    await transporter.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, html, text });
    return { sent: true as const };
  } catch (e: any) {
    console.error("[mail] failed:", to, e?.message);
    return { sent: false as const, error: String(e?.message || e) };
  }
}
