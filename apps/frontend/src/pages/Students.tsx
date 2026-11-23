import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Async, Avatar, PageHeader, Panel, inputCls } from "@/components/kit";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";

export function Students() {
  const me = getUser()!;
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const { data, loading, error, reload } = useLoad(async () => (await api("/student")).students as any[]);
  const list = (data || []).filter((s) => `${s.name} ${s.email} ${s.graduationYear}`.toLowerCase().includes(q.toLowerCase()));
  const remove = async (id: string) => {
    if (!confirm("Remove this student account permanently?")) return;
    try { await api(`/user/${id}`, { method: "DELETE" }); reload(); } catch (e: any) { setErr(e.message); }
  };
  return (
    <Layout>
      <PageHeader title="Students" subtitle={`${data?.length ?? 0} registered students`} />
      <div className="relative mb-5"><Search size={16} className="absolute left-3 top-2.5 text-zinc-500" /><input className={`${inputCls} pl-9`} placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {err && <p className="mb-4 text-sm text-red-300">{err}</p>}
      <Async loading={loading} error={error} onRetry={reload} empty={list.length === 0} emptyText="No students found.">
        <Panel className="divide-y divide-zinc-800">
          {list.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <Avatar name={s.name} />
              <div className="flex-1 min-w-0"><div className="font-medium truncate">{s.name}</div><div className="text-sm text-zinc-500 truncate">{s.email}</div></div>
              <span className="text-sm text-zinc-400 hidden sm:block">Batch {s.graduationYear ?? "—"}</span>
              {me.role === "ADMIN" && <button onClick={() => remove(s.id)} className="text-zinc-500 hover:text-red-300"><Trash2 size={16} /></button>}
            </div>
          ))}
        </Panel>
      </Async>
    </Layout>
  );
}
