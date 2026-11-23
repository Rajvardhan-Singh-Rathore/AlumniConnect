import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, GraduationCap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/kit";
import { api, saveAuth } from "@/lib/api";

type Role = "STUDENT" | "ALUMNI" | "ADMIN";
const years = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 6 - i);

export function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState<Role>("STUDENT");
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", year: String(new Date().getFullYear()), company: "", jobTitle: "", bio: "", linkedin: "", adminKey: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const base = { name: f.name, email: f.email, password: f.password, Role: role };
      if (role === "ADMIN") {
        const d = await api("/admin/signup", { method: "POST", body: JSON.stringify({ ...base, adminKey: f.adminKey }) });
        saveAuth(d.token, d.user); nav("/admin");
      } else if (role === "ALUMNI") {
        await api("/alumni/signup", { method: "POST", body: JSON.stringify({ ...base, GraduationYear: Number(f.year), company: f.company, jobTitle: f.jobTitle, bio: f.bio, linkedInUrl: f.linkedin }) });
        setPending(true);
      } else {
        await api("/student/signup", { method: "POST", body: JSON.stringify({ ...base, GraduationYear: Number(f.year) }) });
        setPending(true);
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (pending)
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <CheckCircle2 className="mx-auto text-emerald-400" size={52} />
          <h1 className="text-2xl font-semibold">Request submitted</h1>
          <p className="text-zinc-400">An admin will review your account. You'll be able to log in as soon as it's approved.</p>
          <Button onClick={() => nav("/login")}>Back to login</Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 space-y-4">
        <div className="text-center space-y-1">
          <GraduationCap className="mx-auto text-blue-300" size={34} />
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-zinc-400">Join the alumni network</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950 p-1">
          {(["STUDENT", "ALUMNI", "ADMIN"] as Role[]).map((r) => (
            <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-md py-1.5 text-sm transition-colors ${role === r ? "bg-blue-300 text-zinc-900 font-medium" : "text-zinc-400 hover:text-zinc-100"}`}>{r[0] + r.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <Field label="Full name"><input className={inputCls} value={f.name} onChange={set("name")} required /></Field>
        <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={set("email")} required /></Field>
        <Field label="Password (min 6 characters)">
          <div className="relative">
            <input className={inputCls} type={show ? "text" : "password"} minLength={6} value={f.password} onChange={set("password")} required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-2.5 text-zinc-400">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </Field>
        {role !== "ADMIN" && (
          <Field label={role === "ALUMNI" ? "Graduation year" : "Expected graduation year"}>
            <select className={inputCls} value={f.year} onChange={set("year")}>{years.map((y) => <option key={y}>{y}</option>)}</select>
          </Field>
        )}
        {role === "ALUMNI" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company"><input className={inputCls} value={f.company} onChange={set("company")} required /></Field>
              <Field label="Job title"><input className={inputCls} value={f.jobTitle} onChange={set("jobTitle")} required /></Field>
            </div>
            <Field label="LinkedIn URL"><input className={inputCls} value={f.linkedin} onChange={set("linkedin")} required /></Field>
            <Field label="Short bio"><textarea className={`${inputCls} min-h-20`} value={f.bio} onChange={set("bio")} required /></Field>
          </>
        )}
        {role === "ADMIN" && (
          <Field label="Admin key (leave empty if you're the first admin)"><input className={inputCls} type="password" value={f.adminKey} onChange={set("adminKey")} /></Field>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Please wait…" : "Sign up"}</Button>
        <p className="text-center text-sm text-zinc-400">Already have an account? <button type="button" className="text-blue-300 hover:underline" onClick={() => nav("/login")}>Log in</button></p>
      </form>
    </div>
  );
}
