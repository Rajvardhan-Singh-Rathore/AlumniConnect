import { useCallback, useEffect, useState } from "react";

/** Load async data; `reload()` refetches, `setData` allows optimistic updates. */
export function useLoad<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await fn()); } catch (e: any) { setError(e.message || "Something went wrong"); }
    setLoading(false);
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, loading, error, reload };
}
