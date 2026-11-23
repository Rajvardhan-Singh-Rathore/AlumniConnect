import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

export function NotificationBell() {
  const { items, unread, markAllRead, markRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((o) => !o)} className="relative text-zinc-400 hover:text-blue-300" title="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-blue-300 text-zinc-900 text-[10px] font-semibold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-sm">
              <span className="font-medium">Notifications</span>
              <span className="flex gap-3 text-xs text-zinc-400">
                <button onClick={markAllRead} className="hover:text-blue-300">Mark all read</button>
                <button onClick={clear} className="hover:text-red-300">Clear</button>
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && <p className="p-4 text-sm text-zinc-500">You're all caught up.</p>}
              {items.map((n) => (
                <button key={n.id} onClick={() => { markRead(n.id); setOpen(false); if (n.link) nav(n.link); }}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-800 ${n.read ? "opacity-60" : ""}`}>
                  <div className="text-sm">{!n.read && <span className="inline-block h-2 w-2 rounded-full bg-blue-300 mr-2" />}{n.title}</div>
                  {n.body && <div className="text-xs text-zinc-400 truncate">{n.body}</div>}
                  <div className="text-[10px] text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
