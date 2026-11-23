import { useMemo, useState } from "react";
import { Crown, Search, Trash2, UserPlus, X } from "lucide-react";
import { Avatar, Badge, Field, Modal, inputCls, roleTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";

const useUsers = () => useLoad(async () => (await api("/user")).allUsers as any[]);

export function CreateGroupModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const me = getUser()!;
  const users = useUsers();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => (users.data || []).filter((u) => u.id !== me.id && (role === "ALL" || u.role === role) && u.name.toLowerCase().includes(q.toLowerCase())), [users.data, q, role]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setPicked((s) => new Set([...s, ...list.map((u) => u.id)]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const d = await api("/group", { method: "POST", body: JSON.stringify({ name, members: [...picked] }) });
      if (typeof d === "string") throw new Error(d);
      setName(""); setPicked(new Set()); onCreated(d.newGroup.id); onClose();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title="Create a group">
      <form onSubmit={create} className="space-y-3">
        <Field label="Group name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="e.g. Batch 2024 Mentorship" /></Field>
        <p className="text-xs text-zinc-500">Students can read this group but only alumni and admins can post.</p>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={14} className="absolute left-3 top-3 text-zinc-500" /><input className={`${inputCls} pl-8`} placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className={`${inputCls} w-auto`} value={role} onChange={(e) => setRole(e.target.value)}><option value="ALL">All</option><option value="STUDENT">Students</option><option value="ALUMNI">Alumni</option><option value="ADMIN">Admins</option></select>
        </div>
        <div className="flex justify-between text-xs text-zinc-400"><span>{picked.size} selected</span><button type="button" className="text-blue-300 hover:underline" onClick={selectAll}>Select all shown</button></div>
        <div className="max-h-60 overflow-y-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800">
          {users.loading && <p className="p-4 text-sm text-zinc-500">Loading people…</p>}
          {users.error && <p className="p-4 text-sm text-red-300">{users.error}</p>}
          {list.map((u) => (
            <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-900">
              <input type="checkbox" checked={picked.has(u.id)} onChange={() => toggle(u.id)} className="accent-blue-300" />
              <Avatar name={u.name} size={28} /><span className="flex-1 truncate text-sm">{u.name}</span><Badge tone={roleTone(u.role)}>{u.role}</Badge>
            </label>
          ))}
          {!users.loading && list.length === 0 && <p className="p-4 text-sm text-zinc-500">No people match.</p>}
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy || !name.trim()}>{busy ? "Creating…" : `Create group${picked.size ? ` with ${picked.size} member${picked.size > 1 ? "s" : ""}` : ""}`}</Button>
      </form>
    </Modal>
  );
}

export function MembersModal({ group, onClose, onChanged, onDeleted }: { group: any | null; onClose: () => void; onChanged: () => void; onDeleted: () => void }) {
  const me = getUser()!;
  const gid = group?.id;
  const detail = useLoad(async () => (gid ? await api(`/group/${gid}`) : null), [gid]);
  const users = useUsers();
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const members: any[] = detail.data?.members || [];
  const canManage = !!detail.data?.searchedGroup?.canManage;
  const creatorId = detail.data?.searchedGroup?.createdBy;
  const inGroup = new Set(members.map((m) => m.id));
  const candidates = (users.data || []).filter((u) => !inGroup.has(u.id) && u.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const run = async (fn: () => Promise<any>) => { setErr(""); try { await fn(); await detail.reload(); onChanged(); } catch (e: any) { setErr(e.message); } };

  return (
    <Modal open={!!group} onClose={onClose} title={group ? `${group.name} · ${members.length} members` : ""}>
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800 max-h-56 overflow-y-auto">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3 py-2">
            <Avatar name={m.name} size={28} /><span className="flex-1 truncate text-sm">{m.name}{m.id === me.id && " (you)"}</span>
            {m.id === creatorId && <Crown size={14} className="text-amber-300" />}
            <Badge tone={roleTone(m.role)}>{m.role}</Badge>
            {canManage && m.id !== creatorId && <button title="Remove" className="text-zinc-500 hover:text-red-300" onClick={() => run(() => api(`/group/${gid}/members/${m.id}`, { method: "DELETE" }))}><X size={14} /></button>}
          </div>
        ))}
      </div>
      {canManage && (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-medium">Add people</h3>
          <input className={inputCls} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800 max-h-48 overflow-y-auto">
            {candidates.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2">
                <Avatar name={u.name} size={28} /><span className="flex-1 truncate text-sm">{u.name}</span><Badge tone={roleTone(u.role)}>{u.role}</Badge>
                <button title="Add" className="text-blue-300" onClick={() => run(() => api(`/group/${gid}/members`, { method: "POST", body: JSON.stringify({ userIds: [u.id] }) }))}><UserPlus size={16} /></button>
              </div>
            ))}
            {candidates.length === 0 && <p className="p-3 text-sm text-zinc-500">Nobody else to add.</p>}
          </div>
        </div>
      )}
      <div className="mt-5 flex justify-between">
        {canManage
          ? <Button variant="ghost" className="text-red-300" onClick={() => confirm("Delete this group and all its messages?") && run(() => api(`/group/${gid}`, { method: "DELETE" })).then(onDeleted)}><Trash2 size={14} /> Delete group</Button>
          : <Button variant="ghost" className="text-red-300" onClick={() => confirm("Leave this group?") && run(() => api(`/group/${gid}/members/${me.id}`, { method: "DELETE" })).then(onDeleted)}>Leave group</Button>}
        <Button variant="outline" className="dark" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
