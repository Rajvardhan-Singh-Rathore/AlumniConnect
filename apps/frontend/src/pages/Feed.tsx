import { useState } from "react";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Avatar, Async, Badge, Panel, PageHeader, roleTone, inputCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { api, getUser } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { timeAgo } from "@/lib/format";

function Post({ b, onChange, onRemove }: { b: any; onChange: (b: any) => void; onRemove: () => void }) {
  const me = getUser()!;
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const toggleLike = async () => {
    const was = b.liked;
    onChange({ ...b, liked: !was, likeCount: b.likeCount + (was ? -1 : 1) }); // optimistic
    try { await api(`/like/${b.id}`, { method: was ? "DELETE" : "POST" }); }
    catch (e: any) { onChange(b); setErr(e.message); }
  };
  const loadComments = async () => {
    setOpen((o) => !o);
    if (!comments) try { setComments((await api(`/comment/${b.id}`)).Comments); } catch (e: any) { setErr(e.message); }
  };
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api(`/comment/${b.id}`, { method: "POST", body: JSON.stringify({ text }) });
      setText("");
      setComments((await api(`/comment/${b.id}`)).Comments);
      onChange({ ...b, commentCount: b.commentCount + 1 });
    } catch (e: any) { setErr(e.message); }
  };
  const delComment = async (id: string) => {
    try {
      await api(`/comment/${b.id}/${id}`, { method: "DELETE" });
      setComments((c) => (c || []).filter((x) => x.id !== id));
      onChange({ ...b, commentCount: Math.max(0, b.commentCount - 1) });
    } catch (e: any) { setErr(e.message); }
  };
  const del = async () => {
    if (!confirm("Delete this post?")) return;
    try { await api(`/blog/delete/${b.id}`, { method: "DELETE" }); onRemove(); } catch (e: any) { setErr(e.message); }
  };
  const canDelete = me.role === "ADMIN" || b.postedBy === me.id;

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-3">
        <Avatar name={b.author?.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><span className="font-medium truncate">{b.author?.name || "Unknown"}</span>{b.author && <Badge tone={roleTone(b.author.role)}>{b.author.role}</Badge>}</div>
          <div className="text-xs text-zinc-500">{timeAgo(b.postedAt)}</div>
        </div>
        {canDelete && <button onClick={del} className="text-zinc-500 hover:text-red-300"><Trash2 size={16} /></button>}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{b.title}</h3>
      <p className="mt-1 text-zinc-300 whitespace-pre-wrap break-words">{b.description}</p>
      <div className="mt-4 flex items-center gap-5 text-sm text-zinc-400">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition-colors ${b.liked ? "text-pink-400" : "hover:text-pink-400"}`}>
          <Heart size={18} fill={b.liked ? "currentColor" : "none"} /> {b.likeCount}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 hover:text-blue-300"><MessageCircle size={18} /> {b.commentCount}</button>
      </div>
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
      {open && (
        <div className="mt-4 border-t border-zinc-800 pt-4 space-y-3">
          {comments === null && <p className="text-sm text-zinc-500">Loading…</p>}
          {comments?.length === 0 && <p className="text-sm text-zinc-500">No comments yet.</p>}
          {comments?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.author?.name} size={28} />
              <div className="flex-1 rounded-lg bg-zinc-800/70 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-zinc-400"><span className="font-medium text-zinc-200">{c.author?.name}</span>
                  <span className="flex items-center gap-2">{timeAgo(c.commentedAt)}{(c.userId === me.id || me.role === "ADMIN") && <button onClick={() => delComment(c.id)} className="hover:text-red-300"><Trash2 size={12} /></button>}</span></div>
                <p className="text-sm mt-0.5 break-words">{c.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={addComment} className="flex gap-2">
            <input className={inputCls} placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
            <Button type="submit" size="icon" disabled={!text.trim()}><Send size={16} /></Button>
          </form>
        </div>
      )}
    </Panel>
  );
}

export function Feed() {
  const me = getUser()!;
  const { data, setData, loading, error, reload } = useLoad(async () => (await api("/blog")).Blogs as any[]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const d = await api("/blog", { method: "POST", body: JSON.stringify({ title, description }) });
      if (typeof d === "string") throw new Error(d);
      setTitle(""); setDescription(""); await reload();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Layout>
      <PageHeader title={`Welcome back, ${me.name.split(" ")[0]}`} subtitle="Stories, advice and updates from the alumni community." />
      <div className="max-w-2xl mx-auto space-y-5">
        {me.role !== "STUDENT" && (
          <Panel className="p-5">
            <form onSubmit={publish} className="space-y-3">
              <input className={inputCls} placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <textarea className={`${inputCls} min-h-24`} placeholder="Share something with the community…" value={description} onChange={(e) => setDescription(e.target.value)} required />
              {err && <p className="text-sm text-red-300">{err}</p>}
              <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post"}</Button></div>
            </form>
          </Panel>
        )}
        <Async loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No posts yet. Alumni and admins can share the first one!">
          <div className="space-y-5">
            {data?.map((b) => (
              <Post key={b.id} b={b}
                onChange={(nb) => setData((d) => (d || []).map((x) => (x.id === nb.id ? nb : x)))}
                onRemove={() => setData((d) => (d || []).filter((x) => x.id !== b.id))} />
            ))}
          </div>
        </Async>
      </div>
    </Layout>
  );
}
