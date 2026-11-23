import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { db } from "db/client";
import { JWT_SECRET, WS_PORT } from "./lib/config";

/**
 * Protocol (JSON text frames)
 *  client -> server
 *    { type:"dm",    to:<userId>,    text }          alumni <-> alumni only
 *    { type:"group", groupId:<id>,   text }          alumni/admin members only
 *  server -> client
 *    { type:"ready", me:{id,name,role}, online:[ids] }
 *    { type:"dm",    message:{id,senderId,receiverId,text,createdAt} }   (also echoed to sender's other tabs)
 *    { type:"group", message:{id,groupId,userId,senderName,text,sentAt} }
 *    { type:"presence", userId, online }
 *    { type:"error", message }
 * Connect with:  ws://host:3001/?token=<jwt>   (optionally prefixed with "Bearer ")
 */
const MAX_TEXT = 2000;
const online = new Map<string, Set<WebSocket>>(); // userId -> open sockets (multi-tab)

type Me = { id: string; name: string; role: string };
const meOf = new WeakMap<WebSocket, Me>();
const alive = new WeakMap<WebSocket, boolean>();

const send = (ws: WebSocket, payload: unknown) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
};
const sendToUser = (userId: string, payload: unknown) =>
  online.get(userId)?.forEach((s) => send(s, payload));
const broadcast = (payload: unknown) =>
  online.forEach((set) => set.forEach((s) => send(s, payload)));

// HTTP server: the websocket upgrade + a tiny internal endpoint the REST backend calls to push notifications live.
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/internal/notify") {
    if (req.headers["x-internal-key"] !== JWT_SECRET) { res.writeHead(401).end(); return; }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1_000_000) req.destroy(); });
    req.on("end", () => {
      try {
        for (const it of JSON.parse(body).items || []) sendToUser(it.userId, { type: "notification", notification: it.notification });
        res.writeHead(204).end();
      } catch { res.writeHead(400).end(); }
    });
    return;
  }
  res.writeHead(404).end();
});
const wss = new WebSocketServer({ server });
server.listen(WS_PORT);

wss.on("connection", async (ws, req) => {
  // ---- authenticate ----
  let me: Me;
  try {
    const url = new URL(req.url || "/", "http://localhost");
    let raw = url.searchParams.get("token") || req.headers.authorization || "";
    raw = raw.replace(/^Bearer\s+/i, "");
    const decoded = jwt.verify(raw, JWT_SECRET) as { id: string };
    const user: any = await db.orm.public.User.where({ id: decoded.id }).first();
    if (!user) throw new Error("user not found");
    me = { id: user.id, name: user.name, role: user.role };
  } catch {
    send(ws, { type: "error", message: "unauthorized" });
    ws.close(4401, "unauthorized");
    return;
  }

  meOf.set(ws, me);
  alive.set(ws, true);
  const first = !online.has(me.id);
  if (first) online.set(me.id, new Set());
  online.get(me.id)!.add(ws);
  send(ws, { type: "ready", me, online: [...online.keys()] });
  if (first) broadcast({ type: "presence", userId: me.id, online: true });

  ws.on("pong", () => alive.set(ws, true));

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const text = typeof msg.text === "string" ? msg.text.trim() : "";
      if (!text) return send(ws, { type: "error", message: "empty message" });
      if (text.length > MAX_TEXT) return send(ws, { type: "error", message: "message too long" });

      if (msg.type === "dm") {
        const to = String(msg.to || "");
        if (to === me.id) return send(ws, { type: "error", message: "cannot message yourself" });
        const receiver: any = await db.orm.public.User.where({ id: to }).first();
        if (!receiver) return send(ws, { type: "error", message: "user not found" });
        if (me.role !== "ALUMNI" || receiver.role !== "ALUMNI")
          return send(ws, { type: "error", message: "1:1 chat is only between alumni" });
        const saved: any = await db.orm.public.Message.create({ senderId: me.id, receiverId: to, text });
        const out = { type: "dm", message: { ...saved, senderName: me.name } };
        sendToUser(to, out);
        sendToUser(me.id, out); // echo to all of sender's tabs (confirms persistence too)
      } else if (msg.type === "group") {
        const groupId = String(msg.groupId || "");
        if (me.role === "STUDENT")
          return send(ws, { type: "error", message: "students can only view group messages" });
        // load members with the single-field query (the 2-field .where().first() returned null)
        const members: any[] = await db.orm.public.GroupMember.where({ groupId }).all();
        if (!members.some((m) => m.userId === me.id)) return send(ws, { type: "error", message: "not a member of this group" });
        const saved: any = await db.orm.public.GroupMessage.create({ groupId, userId: me.id, text });
        const grp: any = await db.orm.public.Group.where({ id: groupId }).first();
        const out = { type: "group", message: { ...saved, senderName: me.name, groupName: grp?.name || "a group" } };
        members.forEach((m: any) => sendToUser(m.userId, out));
      } else {
        send(ws, { type: "error", message: "unknown message type" });
      }
    } catch (e: any) {
      send(ws, { type: "error", message: "bad request" });
      console.error("ws message error:", e?.message);
    }
  });

  ws.on("close", () => {
    const set = online.get(me.id);
    set?.delete(ws);
    if (set && set.size === 0) {
      online.delete(me.id);
      broadcast({ type: "presence", userId: me.id, online: false });
    }
  });
});

// drop dead connections every 30s
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (alive.get(ws) === false) return ws.terminate();
    alive.set(ws, false);
    ws.ping();
  });
}, 30000);

console.log(`WebSocket + notify server on :${WS_PORT}`);
