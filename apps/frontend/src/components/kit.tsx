import { X, Loader2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export const Avatar = ({ name, size = 40 }: { name?: string; size?: number }) => (
  <div style={{ width: size, height: size }} className="shrink-0 rounded-full bg-gradient-to-br from-blue-300 to-indigo-400 text-zinc-900 font-semibold flex items-center justify-center">
    {(name || "?").trim().slice(0, 1).toUpperCase()}
  </div>
);

const tones: Record<string, string> = {
  blue: "bg-blue-300/15 text-blue-300 border-blue-300/30",
  green: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  amber: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  red: "bg-red-400/15 text-red-300 border-red-400/30",
  zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
};
export const Badge = ({ tone = "zinc", children }: { tone?: keyof typeof tones | string; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.zinc}`}>{children}</span>
);
export const roleTone = (r?: string) => (r === "ADMIN" ? "red" : r === "ALUMNI" ? "blue" : "green");
export const statusTone = (s?: string) => (s === "ACCEPTED" || s === "OPEN" ? "green" : s === "REJECTED" || s === "CLOSED" ? "red" : "amber");

export const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur ${className}`}>{children}</div>
);

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const Spinner = () => (
  <div className="flex justify-center py-16 text-zinc-500"><Loader2 className="animate-spin" /></div>
);
export const Empty = ({ text, icon }: { text: string; icon?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">{icon || <Inbox size={36} />}<p>{text}</p></div>
);
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) =>
  message ? (
    <div className="rounded-lg border border-red-400/30 bg-red-400/10 text-red-300 px-4 py-3 text-sm flex items-center justify-between gap-3 mb-4">
      <span>{message}</span>
      {onRetry && <button className="underline" onClick={onRetry}>Retry</button>}
    </div>
  ) : null;

/** Handles loading / error / empty states around a list. */
export function Async({ loading, error, onRetry, empty, emptyText, children }:
  { loading: boolean; error: string; onRetry?: () => void; empty?: boolean; emptyText?: string; children: ReactNode }) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (empty) return <Empty text={emptyText || "Nothing here yet"} />;
  return <>{children}</>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onMouseDown={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="grid gap-1.5 text-sm text-zinc-300">{label}{children}</label>
);
export const inputCls = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-300/20";

export const Tabs = <T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; badge?: number }[] }) => (
  <div className="flex gap-1 mb-5 border-b border-zinc-800 overflow-x-auto">
    {items.map((t) => (
      <button key={t.id} onClick={() => onChange(t.id)}
        className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${value === t.id ? "border-blue-300 text-blue-300" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}>
        {t.label}{!!t.badge && <span className="ml-2 rounded-full bg-blue-300 text-zinc-900 text-xs px-1.5">{t.badge}</span>}
      </button>
    ))}
  </div>
);
