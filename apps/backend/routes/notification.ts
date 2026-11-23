import express from "express";
import { isLoggedIn } from "../middleware/auth";
import { listFor, markRead, markAllRead, clearAll } from "../lib/notify";

const router = express.Router();
router.get("/", isLoggedIn, (req, res) => {
  const notifications = listFor(req.id as string);
  res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
});
router.post("/read-all", isLoggedIn, (req, res) => { markAllRead(req.id as string); res.json({ ok: true }); });
router.post("/:id/read", isLoggedIn, (req, res) => { markRead(req.id as string, req.params.id as string); res.json({ ok: true }); });
router.delete("/", isLoggedIn, (req, res) => { clearAll(req.id as string); res.json({ ok: true }); });
export default router;
