import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, X, MessageCircle, UserPlus, UserMinus, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Avatar, Badge, PageHeader, Panel, Tabs, inputCls, roleTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { loadRelations } from "@/lib/relations";

export function Connections() {
  const me = getUser()!;
  const nav = useNavigate();
  const [tab, setTab] = useState<"mine" | "requests" | "discover">("mine");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const conns = useLoad(async () => (await api("/connection")).myConnections as any[]);
  const pend = useLoad(async () => (await api("/connection/pending")).pendingRequests as any[]);
  const people = useLoad(async () => (await api("/user")).allUsers as any[]);
  const rel = useLoad(loadRelations);
  const refresh = () => { conns.reload(); pend.reload(); rel.reload(); };
  const run = async (fn: () => Promise<any>) => { setErr(""); try { await fn(); refresh(); } catch (e: any) { setErr(e.message); } };

  const incoming = (pend.data || []).filter((c) => c.direction === "incoming");
  const outgoing = (pend.data || []).filter((c) => c.direction === "outgoing");
  const found = (people.data || []).filter((u) => u.id !== me.id && u.role !== "ADMIN" && u.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Layout>
      <PageHeader title="Connections" subtitle="Grow your network across students and alumni." />
      <Tabs value={tab} onChange={setTab} items={[{ id: "mine", label: "My connections", badge: 0 }, { id: "requests", label: "Requests", badge: incoming.length }, { id: "discover", label: "Discover people" }]} />
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}

      {tab === "mine" && (
        <Async loading={conns.loading} error={conns.error} onRetry={conns.reload} empty={conns.data?.length === 0} emptyText="No connections yet — find people in Discover.">
          <div className="grid gap-3 md:grid-cols-2">
            {conns.data?.map((c) => (
              <Panel key={c.id} className="p-4 flex items-center gap-3">
                <Avatar name={c.other?.name} /><div className="flex-1 min-w-0"><div className="font-medium truncate">{c.other?.name}</div><Badge tone={roleTone(c.other?.role)}>{c.other?.role}</Badge></div>
                {me.role === "ALUMNI" && c.other?.role === "ALUMNI" && <Button size="sm" variant="outline" className="dark" onClick={() => nav(`/allChat?dm=${c.other.id}`)}><MessageCircle size={14} /> Message</Button>}
                <Button size="sm" variant="ghost" className="text-red-300" title="Remove" onClick={() => confirm("Remove this connection?") && run(() => api(`/connection/${c.id}`, { method: "DELETE" }))}><UserMinus size={16} /></Button>
              </Panel>
            ))}
          </div>
        </Async>
      )}

      {tab === "requests" && (
        <Async loading={pend.loading} error={pend.error} onRetry={pend.reload} empty={(pend.data || []).length === 0} emptyText="No pending requests.">
          <div className="space-y-6">
            {incoming.length > 0 && <section><h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-2">Received</h2><div className="space-y-2">
              {incoming.map((c) => (
                <Panel key={c.id} className="p-4 flex items-center gap-3">
                  <Avatar name={c.other?.name} /><div className="flex-1"><div className="font-medium">{c.other?.name}</div><Badge tone={roleTone(c.other?.role)}>{c.other?.role}</Badge></div>
                  <Button size="sm" onClick={() => run(() => api(`/connection/accept/${c.id}`, { method: "POST" }))}><Check size={14} /> Accept</Button>
                  <Button size="sm" variant="outline" className="dark" onClick={() => run(() => api(`/connection/reject/${c.id}`, { method: "POST" }))}><X size={14} /> Decline</Button>
                </Panel>))}</div></section>}
            {outgoing.length > 0 && <section><h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-2">Sent</h2><div className="space-y-2">
              {outgoing.map((c) => (
                <Panel key={c.id} className="p-4 flex items-center gap-3">
                  <Avatar name={c.other?.name} /><div className="flex-1"><div className="font-medium">{c.other?.name}</div><span className="text-xs text-zinc-500">Waiting for response</span></div>
                  <Button size="sm" variant="ghost" onClick={() => run(() => api(`/connection/${c.id}`, { method: "DELETE" }))}>Cancel</Button>
                </Panel>))}</div></section>}
          </div>
        </Async>
      )}

      {tab === "discover" && (
        <>
          <div className="relative mb-4"><Search size={16} className="absolute left-3 top-2.5 text-zinc-500" /><input className={`${inputCls} pl-9`} placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Async loading={people.loading || rel.loading} error={people.error || rel.error} onRetry={() => { people.reload(); rel.reload(); }} empty={found.length === 0} emptyText="No one found.">
            <div className="grid gap-3 md:grid-cols-2">
              {found.map((u) => {
                const r = rel.data?.get(u.id);
                return (
                  <Panel key={u.id} className="p-4 flex items-center gap-3">
                    <Avatar name={u.name} /><div className="flex-1 min-w-0"><div className="font-medium truncate">{u.name}</div><Badge tone={roleTone(u.role)}>{u.role}</Badge></div>
                    {r ? <Badge tone={r === "connected" ? "green" : r === "pending" ? "amber" : "red"}>{r}</Badge>
                      : <Button size="sm" onClick={() => run(() => api(`/connection/${u.id}`, { method: "POST" }))}><UserPlus size={14} /> Connect</Button>}
                  </Panel>
                );
              })}
            </div>
          </Async>
        </>
      )}
    </Layout>
  );
}
