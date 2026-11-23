import { useState } from "react";
import { CalendarDays, Users, Plus, Trash2, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Badge, Field, Modal, PageHeader, Panel, Tabs, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { dateTime, safeUrl, toIso } from "@/lib/format";

const blank = { title: "", time: "", link: "", description: "" };

export function Events() {
  const me = getUser()!;
  const { data, loading, error, reload } = useLoad(async () => (await api("/event")).events as any[]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof blank) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));
  const now = Date.now();
  const list = (data || []).filter((e) => (new Date(e.time).getTime() >= now) === (tab === "upcoming"));
  if (tab === "past") list.reverse();

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusy(id); setErr("");
    try { const d = await fn(); if (typeof d === "string") throw new Error(d); await reload(); return true; } catch (e: any) { setErr(e.message); return false; } finally { setBusy(""); }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await act("new", () => api("/event", { method: "POST", body: JSON.stringify({ ...f, time: toIso(f.time) }) }))) { setOpen(false); setF(blank); }
  };

  return (
    <Layout>
      <PageHeader title="Events" subtitle="Reunions, talks and workshops."
        action={me.role !== "STUDENT" && <Button onClick={() => setOpen(true)}><Plus size={16} /> Create event</Button>} />
      <Tabs value={tab} onChange={setTab} items={[{ id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past" }]} />
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}
      <Async loading={loading} error={error} onRetry={reload} empty={list.length === 0} emptyText={`No ${tab} events.`}>
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((e) => {
            const d = new Date(e.time);
            return (
              <Panel key={e.id} className="p-5 flex gap-4">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-blue-300/10 border border-blue-300/30 text-blue-300 flex flex-col items-center justify-center">
                  <span className="text-xs uppercase">{d.toLocaleString([], { month: "short" })}</span><span className="text-2xl font-semibold leading-none">{d.getDate()}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{e.title}</h3><Badge tone={e.type === "ALUMNI" ? "blue" : "amber"}>{e.type === "ALUMNI" ? "Alumni" : "College"}</Badge></div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-3">{e.description}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} />{dateTime(e.time)}</span>
                    <span className="flex items-center gap-1.5"><Users size={14} />{e.attendeeCount} registered</span>
                  </div>
                  <p className="text-xs text-zinc-500">Hosted by {e.creator?.name || "Unknown"}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {me.role === "STUDENT" && tab === "upcoming" && (
                      <Button variant={e.registered ? "outline" : "default"} className={e.registered ? "dark" : ""} disabled={busy === e.id}
                        onClick={() => act(e.id, () => api(`/application/event/${e.id}`, { method: e.registered ? "DELETE" : "POST" }))}>
                        {e.registered ? "Registered ✓ (cancel)" : "Register"}
                      </Button>
                    )}
                    <a href={safeUrl(e.Link)} target="_blank" rel="noreferrer"><Button variant="outline" className="dark">Event link <ExternalLink size={14} /></Button></a>
                    {e.createdBy === me.id && <Button variant="ghost" className="text-red-300 ml-auto" disabled={busy === e.id}
                      onClick={() => confirm("Delete this event?") && act(e.id, () => api(`/event/${e.id}`, { method: "DELETE" }))}><Trash2 size={16} /></Button>}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </Async>
      <Modal open={open} onClose={() => setOpen(false)} title="Create event">
        <form onSubmit={create} className="space-y-3">
          <Field label="Title"><input className={inputCls} value={f.title} onChange={set("title")} required /></Field>
          <Field label="Date & time"><input className={inputCls} type="datetime-local" value={f.time} onChange={set("time")} required /></Field>
          <Field label="Registration / meeting link"><input className={inputCls} value={f.link} onChange={set("link")} required /></Field>
          <Field label="Description"><textarea className={`${inputCls} min-h-24`} value={f.description} onChange={set("description")} required /></Field>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy === "new"}>{busy === "new" ? "Creating…" : "Create event"}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
