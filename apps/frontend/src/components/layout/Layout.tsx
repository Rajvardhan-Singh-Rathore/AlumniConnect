import { useEffect, useMemo, type ReactNode } from "react";
import { NavLink, Link, useNavigate } from "react-router";
import { GraduationCap, LogOut } from "lucide-react";
import { clearAuth, getToken, getUser } from "@/lib/api";
import { Avatar, Badge, roleTone } from "@/components/kit";
import { NotificationBell } from "@/components/NotificationBell";

const common = [
  { to: "/jobs", label: "Jobs" },
  { to: "/events", label: "Events" },
  { to: "/allAlumni", label: "Alumni" },
];
const NAV: Record<string, { to: string; label: string }[]> = {
  STUDENT: [{ to: "/student", label: "Home" }, ...common, { to: "/connections", label: "Connections" }, { to: "/allChat", label: "Groups" }, { to: "/myApplications", label: "My Applications" }],
  ALUMNI: [{ to: "/alumni", label: "Home" }, ...common, { to: "/connections", label: "Connections" }, { to: "/allChat", label: "Messages" }, { to: "/applications", label: "Applications" }],
  ADMIN: [{ to: "/admin", label: "Home" }, ...common, { to: "/students", label: "Students" }, { to: "/pendingApprovals", label: "Approvals" }, { to: "/applications", label: "Applications" }, { to: "/allChat", label: "Groups" }],
};

export function Layout({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const me = useMemo(getUser, []);
  useEffect(() => { if (!me || !getToken()) nav("/login", { replace: true }); }, []);
  if (!me) return null;
  const logout = () => { clearAuth(); nav("/login", { replace: true }); };
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0A0A0A]/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link to={`/${me.role.toLowerCase()}`} className="flex items-center gap-2 font-semibold text-blue-300 shrink-0">
            <GraduationCap size={22} /> <span className="hidden sm:inline">AlumniConnect</span>
          </Link>
          <nav className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
            {(NAV[me.role] || []).map((l) => (
              <NavLink key={l.to} to={l.to} end
                className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${isActive ? "bg-blue-300 text-zinc-900 font-medium" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <NotificationBell />
          <Link to="/profile" className="flex items-center gap-2 shrink-0 hover:opacity-80">
            <Avatar name={me.name} size={30} />
            <span className="hidden md:flex flex-col leading-tight">
              <span className="text-sm">{me.name}</span>
            </span>
            <Badge tone={roleTone(me.role)}>{me.role}</Badge>
          </Link>
          <button onClick={logout} title="Log out" className="text-zinc-400 hover:text-red-300"><LogOut size={18} /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
