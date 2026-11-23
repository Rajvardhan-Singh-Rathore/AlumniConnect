import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Async, Avatar, Badge, Field, PageHeader, Panel, inputCls, roleTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser, getToken, saveAuth } from "@/lib/api";
import { useLoad } from "@/lib/hooks";

export function Profile() {
  const me = getUser()!;
  const [f, setF] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const { loading, error, reload } = useLoad(async () => {
    const u = (await api(`/user/${me.id}`)).searchedUser;
    let extra: any = {};
    if (me.role === "ALUMNI") extra = ((await api("/alumni")).alumni as any[]).find((a) => a.userId === me.id) || {};
    setF({ name: u.name, email: u.email, graduationYear: u.graduationYear ?? extra.graduationYear ?? "", company: extra.company || "", jobTitle: extra.jobTitle || "", bio: extra.bio || "", linkedinUrl: extra.linkedinUrl || "" });
    return u;
  });
  const set = (k: string) => (e: any) => setF((s: any) => ({ ...s, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setErr("");
    try {
      const gy = Number(f.graduationYear);
      if (me.role === "ALUMNI") await api("/alumni", { method: "PUT", body: JSON.stringify({ graduationYear: gy, company: f.company, jobTitle: f.jobTitle, bio: f.bio, linkedinUrl: f.linkedinUrl }) });
      if (me.role === "STUDENT") {
        await api("/student", { method: "PUT", body: JSON.stringify({ graduationYear: gy, name: f.name, email: f.email }) });
        saveAuth(getToken(), { ...me, name: f.name, email: f.email });
      }
      setMsg("Profile updated"); reload();
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <Layout>
      <PageHeader title="My profile" />
      <Async loading={loading} error={error} onRetry={reload}>
        <Panel className="max-w-xl p-6">
          <div className="flex items-center gap-4 mb-6"><Avatar name={f.name} size={64} />
            <div><div className="text-xl font-semibold">{f.name}</div><div className="text-sm text-zinc-400">{f.email}</div><div className="mt-1"><Badge tone={roleTone(me.role)}>{me.role}</Badge></div></div></div>
          <form onSubmit={save} className="space-y-3">
            {me.role === "STUDENT" && <>
              <Field label="Name"><input className={inputCls} value={f.name || ""} onChange={set("name")} required /></Field>
              <Field label="Email"><input className={inputCls} type="email" value={f.email || ""} onChange={set("email")} required /></Field>
            </>}
            {me.role !== "ADMIN" && <Field label="Graduation year"><input className={inputCls} type="number" value={f.graduationYear} onChange={set("graduationYear")} required /></Field>}
            {me.role === "ALUMNI" && <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company"><input className={inputCls} value={f.company} onChange={set("company")} /></Field>
                <Field label="Job title"><input className={inputCls} value={f.jobTitle} onChange={set("jobTitle")} /></Field>
              </div>
              <Field label="LinkedIn URL"><input className={inputCls} value={f.linkedinUrl} onChange={set("linkedinUrl")} /></Field>
              <Field label="Bio"><textarea className={`${inputCls} min-h-24`} value={f.bio} onChange={set("bio")} /></Field>
            </>}
            {me.role === "ADMIN" && <p className="text-sm text-zinc-400">Admin accounts have no editable profile fields.</p>}
            {msg && <p className="text-sm text-emerald-300">{msg}</p>}{err && <p className="text-sm text-red-300">{err}</p>}
            {me.role !== "ADMIN" && <Button type="submit">Save changes</Button>}
          </form>
        </Panel>
      </Async>
    </Layout>
  );
}
