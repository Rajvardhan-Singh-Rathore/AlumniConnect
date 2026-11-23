import { useState } from "react";
import { Check, X, Building2, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Avatar, Badge, PageHeader, Panel, roleTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { timeAgo, safeUrl } from "@/lib/format";

export function PendingApprovals() {
  const { data, loading, error, reload } = useLoad(async () => (await api("/admin/pendingApprovals")).pendingApprovals as any[]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const decide = async (id: string, verb: "accept" | "reject") => {
    setBusy(id); setErr("");
    try { await api(`/admin/approval/${verb}/${id}`, { method: "POST" }); await reload(); } catch (e: any) { setErr(e.message); }
    setBusy("");
  };
  return (
    <Layout>
      <PageHeader title="Pending approvals" subtitle="Review new student and alumni sign-ups." />
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}
      <Async loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="You're all caught up — no pending requests.">
        <div className="space-y-3">
          {data?.map((p) => (
            <Panel key={p.id} className="p-5 flex flex-wrap items-center gap-4">
              <Avatar name={p.name} size={46} />
              <div className="flex-1 min-w-56 space-y-1">
                <div className="flex items-center gap-2"><span className="font-medium">{p.name}</span><Badge tone={roleTone(p.role)}>{p.role}</Badge></div>
                <div className="text-sm text-zinc-400">{p.email} · Batch {p.graduationYear} · requested {timeAgo(p.createdAt)}</div>
                {p.role === "ALUMNI" && <div className="text-sm text-zinc-400 flex flex-wrap gap-x-4"><span className="flex items-center gap-1.5"><Building2 size={14} />{p.jobTitle} at {p.company}</span>
                  {p.linkedinUrl && <a className="flex items-center gap-1.5 text-blue-300 hover:underline" href={safeUrl(p.linkedinUrl)} target="_blank" rel="noreferrer"><ExternalLink size={14} />LinkedIn</a>}</div>}
                {p.bio && <p className="text-sm text-zinc-300">{p.bio}</p>}
              </div>
              <div className="flex gap-2">
                <Button disabled={busy === p.id} onClick={() => decide(p.id, "accept")}><Check size={16} /> Approve</Button>
                <Button variant="outline" className="dark" disabled={busy === p.id} onClick={() => confirm("Reject this request?") && decide(p.id, "reject")}><X size={16} /> Reject</Button>
              </div>
            </Panel>
          ))}
        </div>
      </Async>
    </Layout>
  );
}
