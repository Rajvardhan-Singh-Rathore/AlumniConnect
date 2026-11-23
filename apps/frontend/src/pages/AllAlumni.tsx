import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, ExternalLink, GraduationCap, UserPlus, MessageCircle, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Avatar, Badge, PageHeader, Panel, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { loadRelations } from "@/lib/relations";
import { safeUrl } from "@/lib/format";

export function AllAlumni() {
  const me = getUser()!;
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const alumni = useLoad(async () => (await api("/alumni")).alumni as any[]);
  const rel = useLoad(loadRelations);
  const list = (alumni.data || []).filter((a) => a.userId !== me.id &&
    `${a.user?.name} ${a.company} ${a.jobTitle} ${a.graduationYear}`.toLowerCase().includes(q.toLowerCase()));
  const connect = async (id: string) => { setErr(""); try { await api(`/connection/${id}`, { method: "POST" }); rel.reload(); } catch (e: any) { setErr(e.message); } };

  return (
    <Layout>
      <PageHeader title="Alumni directory" subtitle="Find mentors by company, role or batch." />
      <div className="relative mb-5"><Search size={16} className="absolute left-3 top-2.5 text-zinc-500" /><input className={`${inputCls} pl-9`} placeholder="Search name, company, role, year…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}
      <Async loading={alumni.loading} error={alumni.error} onRetry={alumni.reload} empty={list.length === 0} emptyText="No alumni found.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => {
            const r = rel.data?.get(a.userId);
            return (
              <Panel key={a.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3"><Avatar name={a.user.name} size={48} />
                  <div className="min-w-0"><div className="font-semibold truncate">{a.user.name}</div><div className="text-sm text-zinc-400 truncate">{a.jobTitle}</div></div></div>
                <div className="flex flex-wrap gap-2 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5"><Building2 size={14} />{a.company}</span>
                  <span className="flex items-center gap-1.5"><GraduationCap size={14} />Class of {a.graduationYear}</span>
                </div>
                <p className="text-sm text-zinc-300 line-clamp-3">{a.bio}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {me.role !== "ADMIN" && (r ? <Badge tone={r === "connected" ? "green" : r === "pending" ? "amber" : "red"}>{r}</Badge>
                    : <Button size="sm" onClick={() => connect(a.userId)}><UserPlus size={14} /> Connect</Button>)}
                  {me.role === "ALUMNI" && <Button size="sm" variant="outline" className="dark" onClick={() => nav(`/allChat?dm=${a.userId}`)}><MessageCircle size={14} /> Message</Button>}
                  {a.linkedinUrl && <a href={safeUrl(a.linkedinUrl)} target="_blank" rel="noreferrer" className="ml-auto"><Button size="sm" variant="ghost"><ExternalLink size={16} /></Button></a>}
                </div>
              </Panel>
            );
          })}
        </div>
      </Async>
    </Layout>
  );
}
