const APP_NAME = process.env.APP_NAME || "AlumniConnect";
export const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const layout = (title: string, body: string, cta?: { label: string; url: string }) => `
<div style="background:#0a0a0a;padding:24px;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:auto;background:#18181b;border-radius:12px;padding:28px;color:#e4e4e7">
    <h2 style="margin:0 0 16px;color:#93c5fd">${esc(APP_NAME)}</h2>
    <h3 style="margin:0 0 12px;color:#fff">${esc(title)}</h3>
    <div style="line-height:1.6;font-size:15px">${body}</div>
    ${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="background:#93c5fd;color:#18181b;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
    <p style="margin:28px 0 0;font-size:12px;color:#71717a">You received this email because of your ${esc(APP_NAME)} account activity.</p>
  </div>
</div>`;

export const approvedEmail = (name: string) => ({
  subject: `Your ${APP_NAME} account is approved 🎉`,
  text: `Hi ${name},\n\nGood news - your signup request was approved. You can log in now: ${APP_URL}/login\n\n- ${APP_NAME}`,
  html: layout("Your request was approved", `<p>Hi ${esc(name)},</p><p>Good news - your signup request has been <b>approved</b>. You can now log in and start connecting.</p>`, { label: "Log in", url: `${APP_URL}/login` }),
});

export const rejectedEmail = (name: string, reason?: string) => ({
  subject: `Update on your ${APP_NAME} signup request`,
  text: `Hi ${name},\n\nSorry, your signup request could not be approved at this time.${reason ? `\nReason: ${reason}` : ""}\nIf you think this is a mistake, you can sign up again with correct details or contact your college admin.\n\n- ${APP_NAME}`,
  html: layout("Signup request not approved", `<p>Hi ${esc(name)},</p><p>Sorry, your signup request could not be approved at this time.</p>${reason ? `<p><b>Reason:</b> ${esc(reason)}</p>` : ""}<p>If you think this is a mistake, you can sign up again with correct details or contact your college admin.</p>`),
});

export const inactiveEmail = (name: string, days: number) => ({
  subject: `We miss you on ${APP_NAME}!`,
  text: `Hi ${name},\n\nIt has been over ${days} days since you were last active. Students and fellow alumni would love to hear from you - jobs, events and messages are waiting: ${APP_URL}/login\n\n- ${APP_NAME}`,
  html: layout("We miss you!", `<p>Hi ${esc(name)},</p><p>It has been over <b>${days} days</b> since you were last active. Students and fellow alumni would love to hear from you - new jobs, events and messages may be waiting.</p>`, { label: "Visit AlumniConnect", url: `${APP_URL}/login` }),
});
