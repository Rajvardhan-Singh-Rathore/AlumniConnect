import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { Bell, X } from "lucide-react";
import { api, getToken, getUser } from "./api";
import { useChatSocket, type WsEvent } from "./useChatSocket";

export type Notif = { id: string; type: string; title: string; body?: string; link?: string; createdAt: string; read: boolean };
type Toast = { tid: number; title: string; body?: string; link?: string };
type Ctx = { items: Notif[]; unread: number; markAllRead: () => void; markRead: (id: string) => void; clear: () => void };

const NotifCtx = createContext<Ctx>({ items: [], unread: 0, markAllRead() {}, markRead() {}, clear() {} });
export const useNotifications = () => useContext(NotifCtx);

/** One shared socket for the whole app (only while logged in). Shows pop-ups and feeds the bell. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  useLocation(); // re-render on navigation so login/logout is noticed
  const token = getToken();
  const nav = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((t: Omit<Toast, "tid">) => {
    const tid = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-3), { ...t, tid }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.tid !== tid)), 6000);
  }, []);

  useEffect(() => {
    if (!token) { setItems([]); return; }
    api("/notification").then((d) => setItems(d.notifications || [])).catch(() => {});
  }, [token]);

  const onEvent = useCallback((e: WsEvent) => {
    if (e.type === "notification") {
      setItems((l) => [e.notification, ...l.filter((x) => x.id !== e.notification.id)].slice(0, 50));
      pushToast(e.notification);
    } else if (e.type === "dm" || e.type === "group") {
      // message pop-ups: not for your own messages, and not while you're already on the chat page
      if (/^\/(chat|allChat)/.test(window.location.pathname)) return;
      const myId = getUser()?.id;
      if (e.type === "dm" && e.message.senderId !== myId)
        pushToast({ title: `New message from ${e.message.senderName || "an alumni"}`, body: e.message.text.slice(0, 80), link: "/allChat" });
      if (e.type === "group" && e.message.userId !== myId)
        pushToast({ title: `${e.message.senderName} in ${e.message.groupName || "a group"}`, body: e.message.text.slice(0, 80), link: "/allChat" });
    }
  }, [pushToast]);

  const markAllRead = () => { setItems((l) => l.map((n) => ({ ...n, read: true }))); api("/notification/read-all", { method: "POST" }).catch(() => {}); };
  const markRead = (id: string) => { setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))); api(`/notification/${id}/read`, { method: "POST" }).catch(() => {}); };
  const clear = () => { setItems([]); api("/notification", { method: "DELETE" }).catch(() => {}); };

  return (
    <NotifCtx.Provider value={{ items, unread: items.filter((n) => !n.read).length, markAllRead, markRead, clear }}>
      {token && <Live key={token} onEvent={onEvent} />}
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div key={t.tid} onClick={() => { if (t.link) nav(t.link); setToasts((l) => l.filter((x) => x.tid !== t.tid)); }}
            className="cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-lg flex gap-3 animate-in slide-in-from-right">
            <Bell size={18} className="text-blue-300 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-100">{t.title}</div>
              {t.body && <div className="text-xs text-zinc-400 truncate">{t.body}</div>}
            </div>
            <button onClick={(ev) => { ev.stopPropagation(); setToasts((l) => l.filter((x) => x.tid !== t.tid)); }} className="text-zinc-500 hover:text-zinc-200"><X size={14} /></button>
          </div>
        ))}
      </div>
    </NotifCtx.Provider>
  );
}

function Live({ onEvent }: { onEvent: (e: WsEvent) => void }) {
  useChatSocket(onEvent);
  return null;
}
