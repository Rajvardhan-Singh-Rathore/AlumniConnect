# Notifications - Stage 1 (email)
Setup: `bun install` (adds nodemailer) -> add SMTP_* vars from `apps/backend/.env.example` to `apps/backend/.env` -> restart backend.
Without SMTP vars the emails are just printed in the backend console (safe for testing).

1. Signup approved / rejected -> email goes to the applicant automatically (admin pages unchanged).
   Optional: send `{ "reason": "..." }` in the body of POST /admin/approval/reject/:id to include a reason.
2. Inactive alumni -> checked once a day. "Inactive" = no login/request and nothing posted/sent for INACTIVE_DAYS (default 60).
   Nobody is flagged until INACTIVE_DAYS after this feature first ran. One reminder per alumni per REMINDER_COOLDOWN_DAYS.
   Admin test (preview only): POST /api/v1/admin/notify/inactive?days=0&dryRun=true   (Authorization: Bearer <admin token>)
   Send now: same URL without dryRun.
Free SMTP options: Gmail app password (~500/day), Brevo (300/day), Mailtrap (test inbox), Resend free tier (needs own domain to email others).

# Stage 2 - pop-up + bell notifications (in-app, live)
New: like / comment on your post, new job, new event -> pop-up (bottom-right) + bell icon list in the top bar.
Needs the websocket server running (it also receives pushes from the backend). No new packages, no DB migration.
Stored in apps/backend/data/notifications.json (last 50 per user). Optional env: WS_INTERNAL_URL (default http://localhost:3001/internal/notify)

# Stage 3 - message pop-ups
New direct message (alumni 1:1) or new group message -> pop-up with sender + preview, click opens chat.
Not shown for your own messages or while you are on the chat page. Pop-ups only (not stored in the bell, chat has its own history).
No new packages / no migration. Restart websocket server + frontend.
