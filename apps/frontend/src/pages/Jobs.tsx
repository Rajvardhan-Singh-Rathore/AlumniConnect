import { useState } from "react";
import { Briefcase, MapPin, Wallet, CalendarClock, Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Badge, Field, Modal, PageHeader, Panel, inputCls, statusTone, Avatar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { dateOnly, safeUrl, timeAgo, toIso } from "@/lib/format";

const blank = { company: "", type: "FULLTIME", location: "", stipend: "", link: "", deadline: "", description: "" };

export function Jobs() {
  const me = getUser()!;
  const { data, loading, error, reload } = useLoad(async () => (await api("/job")).allJobs as any[]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof blank) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));

  const jobs = (data || []).filter((j) =>
    (type === "ALL" || j.type === type) && `${j.company} ${j.location} ${j.description}`.toLowerCase().includes(q.toLowerCase()));

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusy(id); setErr("");
    try { const d = await fn(); if (typeof d === "string") throw new Error(d); await reload(); } catch (e: any) { setErr(e.message); }
    setBusy("");
  };
  const post = (e: React.FormEvent) => {
    e.preventDefault();
    act("new", () => api("/job", { method: "POST", body: JSON.stringify({ ...f, deadline: toIso(f.deadline), status: "OPEN" }) })).then(() => { setOpen(false); setF(blank); });
  };

  return (
    <Layout>
      <PageHeader title="Jobs & Internships" subtitle="Opportunities shared by alumni and the placement team."
        action={me.role !== "STUDENT" && <Button onClick={() => setOpen(true)}><Plus size={16} /> Post a job</Button>} />
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-56"><Search size={16} className="absolute left-3 top-2.5 text-zinc-500" />
          <input className={`${inputCls} pl-9`} placeholder="Search company, location…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className={`${inputCls} w-auto`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All types</option><option value="FULLTIME">Full-time</option><option value="PARTTIME">Part-time</option>
        </select>
      </div>
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}
      <Async loading={loading} error={error} onRetry={reload} empty={jobs.length === 0} emptyText="No jobs match your search.">
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <Panel key={j.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-300"><Briefcase size={20} /></div>
                  <div className="min-w-0"><h3 className="font-semibold truncate">{j.company}</h3>
                    <p className="text-xs text-zinc-500">Posted {timeAgo(j.postedAt)}</p></div>
                </div>
                <div className="flex gap-2 shrink-0"><Badge tone="blue">{j.type === "FULLTIME" ? "Full-time" : "Part-time"}</Badge><Badge tone={statusTone(j.status)}>{j.status}</Badge></div>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-4 whitespace-pre-wrap">{j.description}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5"><MapPin size={14} />{j.location}</span>
                <span className="flex items-center gap-1.5"><Wallet size={14} />{j.stipend}</span>
                <span className="flex items-center gap-1.5"><CalendarClock size={14} />Apply by {dateOnly(j.deadline)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500"><Avatar name={j.poster?.name} size={20} />Shared by {j.poster?.name || "Unknown"}{me.role !== "STUDENT" && ` · ${j.applicationCount} applicant(s)`}</div>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {me.role === "STUDENT" && (
                  <Button disabled={j.applied || j.status === "CLOSED" || busy === j.id} onClick={() => act(j.id, () => api(`/application/job/${j.id}`, { method: "POST" }))}>
                    {j.applied ? "Applied ✓" : j.status === "CLOSED" ? "Closed" : "Apply now"}
                  </Button>
                )}
                <a href={safeUrl(j.link)} target="_blank" rel="noreferrer"><Button variant="outline" className="dark">Details <ExternalLink size={14} /></Button></a>
                {(me.role === "ADMIN" || j.postedBy === me.id) && (
                  <Button variant="ghost" className="text-red-300 ml-auto" disabled={busy === j.id}
                    onClick={() => confirm("Delete this job?") && act(j.id, () => api(`/job/${j.id}`, { method: "DELETE" }))}><Trash2 size={16} /></Button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      </Async>
      <Modal open={open} onClose={() => setOpen(false)} title="Post a job">
        <form onSubmit={post} className="space-y-3">
          <Field label="Company"><input className={inputCls} value={f.company} onChange={set("company")} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className={inputCls} value={f.type} onChange={set("type")}><option value="FULLTIME">Full-time</option><option value="PARTTIME">Part-time</option></select></Field>
            <Field label="Location"><input className={inputCls} value={f.location} onChange={set("location")} required /></Field>
            <Field label="Stipend / salary"><input className={inputCls} value={f.stipend} onChange={set("stipend")} required placeholder="e.g. ₹30k/month" /></Field>
            <Field label="Apply by"><input className={inputCls} type="datetime-local" value={f.deadline} onChange={set("deadline")} required /></Field>
          </div>
          <Field label="Application link"><input className={inputCls} value={f.link} onChange={set("link")} required /></Field>
          <Field label="Description"><textarea className={`${inputCls} min-h-24`} value={f.description} onChange={set("description")} required /></Field>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy === "new"}>{busy === "new" ? "Posting…" : "Publish job"}</Button>
        </form>
      </Modal>
    </Layout>
  );
}
