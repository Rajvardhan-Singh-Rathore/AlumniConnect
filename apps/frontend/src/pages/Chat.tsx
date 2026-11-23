import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Send, Users, MessageCircle, Lock, Plus, Settings2 } from "lucide-react";
import { CreateGroupModal, MembersModal } from "@/components/GroupModals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getUser, getToken } from "@/lib/api";
import { useChatSocket, type WsEvent } from "@/lib/useChatSocket";

type Msg = { id: string; senderId: string; senderName?: string; text: string; at: string };
type Conv = { key: string; kind: "dm" | "group"; id: string; title: string };

const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function Chat() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const deepLinked = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const me = useMemo(getUser, []);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tab, setTab] = useState<"dm" | "group">(me?.role === "ALUMNI" ? "dm" : "group");
  const [active, setActive] = useState<Conv | null>(null);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const activeKey = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!me || !getToken()) nav("/login"); }, []);

  const add = (key: string, m: Msg) =>
    setThreads((t) => (t[key]?.some((x) => x.id === m.id) ? t : { ...t, [key]: [...(t[key] || []), m] }));

  const { status, send } = useChatSocket((e: WsEvent) => {
    if (e.type === "ready") setOnline(new Set(e.online));
    else if (e.type === "presence")
      setOnline((s) => { const n = new Set(s); e.online ? n.add(e.userId) : n.delete(e.userId); return n; });
    else if (e.type === "error") { setErr(e.message); setTimeout(() => setErr(""), 4000); }
    else if (e.type === "dm") {
      const m = e.message, other = m.senderId === me!.id ? m.receiverId : m.senderId, key = `dm:${other}`;
      add(key, { id: m.id, senderId: m.senderId, text: m.text, at: m.createdAt });
      if (activeKey.current !== key && m.senderId !== me!.id) setUnread((u) => ({ ...u, [key]: (u[key] || 0) + 1 }));
    } else if (e.type === "group") {
      const m = e.message, key = `group:${m.groupId}`;
      add(key, { id: m.id, senderId: m.userId, senderName: m.senderName, text: m.text, at: m.sentAt });
      if (activeKey.current !== key && m.userId !== me!.id) setUnread((u) => ({ ...u, [key]: (u[key] || 0) + 1 }));
    }
  });

  useEffect(() => {
    if (me?.role === "ALUMNI") api("/user/alumni").then((d) => setAlumni(d.alumni || [])).catch((e) => setErr(e.message));
    api("/group").then((d) => setGroups(d.myGroups || [])).catch((e) => setErr(e.message));
  }, []);

  const loadGroups = () => api("/group").then((d) => setGroups(d.myGroups || [])).catch((e) => setErr(e.message));

  const open = async (c: Conv) => {
    setActive(c); activeKey.current = c.key; setUnread((u) => ({ ...u, [c.key]: 0 }));
    try {
      const d = await api(c.kind === "dm" ? `/message/user/${c.id}` : `/message/group/${c.id}`);
      const rows: Msg[] = c.kind === "dm"
        ? d.directMessages.map((m: any) => ({ id: m.id, senderId: m.senderId, text: m.text, at: m.createdAt }))
        : d.groupMessages.map((m: any) => ({ id: m.id, senderId: m.userId, senderName: m.senderName, text: m.text, at: m.sentAt }));
      setThreads((t) => {
        const live = (t[c.key] || []).filter((x) => !rows.some((r) => r.id === x.id));
        return { ...t, [c.key]: [...rows, ...live] };
      });
    } catch (e: any) { setErr(e.message); }
  };

  // /allChat?dm=<alumniId> opens that conversation directly
  useEffect(() => {
    const id = params.get("dm");
    const u = id && alumni.find((a) => a.id === id);
    if (u && !deepLinked.current) { deepLinked.current = true; setTab("dm"); open({ key: `dm:${u.id}`, kind: "dm", id: u.id, title: u.name }); }
  }, [alumni]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [threads, active]);

  const canSend = !!active && (active.kind === "dm" || me?.role !== "STUDENT");
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const t = text.trim();
    if (!t || !active || !canSend) return;
    const ok = send(active.kind === "dm" ? { type: "dm", to: active.id, text: t } : { type: "group", groupId: active.id, text: t });
    if (ok) setText(""); else setErr("Not connected, retrying…");
  };

  const list: Conv[] = tab === "dm"
    ? alumni.map((u) => ({ key: `dm:${u.id}`, kind: "dm", id: u.id, title: u.name }))
    : groups.map((g) => ({ key: `group:${g.id}`, kind: "group", id: g.id, title: g.name }));
  const msgs = (active && threads[active.key]) || [];
  const dot = { open: "bg-emerald-400", connecting: "bg-amber-400", closed: "bg-red-500" }[status];

  return (
    <div className="h-screen bg-[#0A0A0A] text-zinc-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-zinc-300" onClick={() => nav(`/${(me?.role || "student").toLowerCase()}`)}>← Back</Button>
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400"><span className={`h-2 w-2 rounded-full ${dot}`} />{status}</div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 border-r border-zinc-800 flex flex-col">
          <div className="flex p-2 gap-2">
            {me?.role === "ALUMNI" && (
              <button onClick={() => setTab("dm")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm ${tab === "dm" ? "bg-blue-300 text-zinc-900" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}>
                <MessageCircle size={16} /> Alumni
              </button>
            )}
            <button onClick={() => setTab("group")} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm ${tab === "group" ? "bg-blue-300 text-zinc-900" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}>
              <Users size={16} /> Groups
            </button>
          </div>
          {tab === "group" && me?.role !== "STUDENT" && (
            <div className="px-2 pb-1"><Button size="sm" variant="outline" className="dark w-full" onClick={() => setShowCreate(true)}><Plus size={14} /> New group</Button></div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {list.length === 0 && <p className="text-sm text-zinc-500 p-3">{tab === "dm" ? "No other alumni yet." : "You're not in any group yet."}</p>}
            {list.map((c) => (
              <button key={c.key} onClick={() => open(c)} className={`w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${active?.key === c.key ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
                <div className="relative h-9 w-9 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium">
                  {c.title.slice(0, 1).toUpperCase()}
                  {c.kind === "dm" && online.has(c.id) && <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0A0A0A]" />}
                </div>
                <span className="flex-1 truncate">{c.title}</span>
                {!!unread[c.key] && <span className="text-xs bg-blue-300 text-zinc-900 rounded-full px-2 py-0.5">{unread[c.key]}</span>}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500">Select a conversation to start chatting</div>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-zinc-800 font-medium flex items-center">{active.title}
                {active.kind === "group" && me?.role === "STUDENT" && <span className="ml-3 text-xs text-zinc-400 inline-flex items-center gap-1"><Lock size={12} /> view only</span>}
                {active.kind === "group" && <Button size="sm" variant="ghost" className="ml-auto text-zinc-300" onClick={() => setShowMembers(true)}><Settings2 size={14} /> Members</Button>}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {msgs.map((m) => {
                  const mine = m.senderId === me!.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${mine ? "bg-blue-300 text-zinc-900 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"}`}>
                        {!mine && active.kind === "group" && <div className="text-xs text-blue-300 mb-0.5">{m.senderName}</div>}
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        <div className={`text-[10px] mt-1 text-right ${mine ? "text-zinc-700" : "text-zinc-400"}`}>{fmt(m.at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              {err && <div className="px-6 py-2 text-sm text-red-400">{err}</div>}
              <form onSubmit={submit} className="p-4 border-t border-zinc-800 flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} disabled={!canSend} maxLength={2000}
                  placeholder={canSend ? "Type a message…" : "Only alumni and admins can send messages in groups"} className="dark" />
                <Button type="submit" disabled={!canSend || !text.trim() || status !== "open"}><Send size={16} /></Button>
              </form>
            </>
          )}
        </main>
      </div>
      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)}
        onCreated={async (id) => { await loadGroups(); setTab("group"); open({ key: `group:${id}`, kind: "group", id, title: "New group" }); loadGroups(); }} />
      <MembersModal group={showMembers && active?.kind === "group" ? groups.find((g) => g.id === active.id) || { id: active.id, name: active.title } : null}
        onClose={() => setShowMembers(false)} onChanged={loadGroups}
        onDeleted={() => { setShowMembers(false); setActive(null); activeKey.current = null; loadGroups(); }} />
    </div>
  );
}
