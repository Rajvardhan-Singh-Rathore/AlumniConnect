import { useState } from "react";
import { Check, X, Briefcase } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Avatar, Badge, PageHeader, Panel, Tabs, statusTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { dateOnly, timeAgo } from "@/lib/format";

/** Student view: my own applications. */
export function MyApplications() {
  const { data, loading, error, reload } = useLoad(async () => (await api("/application/myApplications")).myApplications as any[]);
  return (
    <Layout>
      <PageHeader title="My applications" subtitle="Track the jobs you've applied to." />
      <Async loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="You haven't applied to any jobs yet.">
        <div className="space-y-3">
          {data?.map((a) => (
            <Panel key={a.id} className="p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-300"><Briefcase size={20} /></div>
              <div className="flex-1 min-w-0"><div className="font-medium truncate">{a.job?.company || "Removed job"}</div>
                <div className="text-sm text-zinc-500">{a.job?.location} · applied {timeAgo(a.appliedAt)}{a.job && ` · deadline ${dateOnly(a.job.deadline)}`}</div></div>
              <Badge tone={statusTone(a.status)}>{a.status}</Badge>
            </Panel>
          ))}
        </div>
      </Async>
    </Layout>
  );
}

/** Alumni/admin view: applicants to jobs I posted (admin: all). */
export function Applications() {
  const { data, loading, error, reload } = useLoad(async () => (await api("/application")).applications as any[]);
  const [tab, setTab] = useState<"PENDING" | "ACCEPTED" | "REJECTED">("PENDING");
  const [err, setErr] = useState("");
  const list = (data || []).filter((a) => a.status === tab);
  const count = (s: string) => (data || []).filter((a) => a.status === s).length;
  const decide = async (id: string, status: string) => {
    setErr("");
    try { await api(`/application/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); reload(); } catch (e: any) { setErr(e.message); }
  };
  return (
    <Layout>
      <PageHeader title="Applications" subtitle="Review students who applied to your jobs." />
      <Tabs value={tab} onChange={setTab} items={[{ id: "PENDING", label: "Pending", badge: count("PENDING") }, { id: "ACCEPTED", label: "Accepted" }, { id: "REJECTED", label: "Rejected" }]} />
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}
      <Async loading={loading} error={error} onRetry={reload} empty={list.length === 0} emptyText={`No ${tab.toLowerCase()} applications.`}>
        <div className="space-y-3">
          {list.map((a) => (
            <Panel key={a.id} className="p-4 flex flex-wrap items-center gap-4">
              <Avatar name={a.user?.name} />
              <div className="flex-1 min-w-48"><div className="font-medium">{a.user?.name}</div>
                <div className="text-sm text-zinc-500">{a.user?.email} · Batch {a.user?.graduationYear ?? "—"}</div>
                <div className="text-sm text-zinc-400 mt-0.5">Applied to <span className="text-zinc-200">{a.job?.company}</span> · {timeAgo(a.appliedAt)}</div></div>
              {a.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(a.id, "ACCEPTED")}><Check size={14} /> Accept</Button>
                  <Button size="sm" variant="outline" className="dark" onClick={() => decide(a.id, "REJECTED")}><X size={14} /> Reject</Button>
                </div>
              ) : <Button size="sm" variant="ghost" onClick={() => decide(a.id, "PENDING")}>Undo</Button>}
            </Panel>
          ))}
        </div>
      </Async>
    </Layout>
  );
}
