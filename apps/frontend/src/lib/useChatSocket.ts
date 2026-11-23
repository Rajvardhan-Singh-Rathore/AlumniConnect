import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, getToken } from "./api";

export type WsEvent =
  | { type: "ready"; me: { id: string; name: string; role: string }; online: string[] }
  | { type: "dm"; message: { id: string; senderId: string; receiverId: string; text: string; createdAt: string; senderName?: string } }
  | { type: "group"; message: { id: string; groupId: string; userId: string; senderName: string; groupName?: string; text: string; sentAt: string } }
  | { type: "presence"; userId: string; online: boolean }
  | { type: "notification"; notification: { id: string; type: string; title: string; body?: string; link?: string; createdAt: string; read: boolean } }
  | { type: "error"; message: string };

/** Authenticated websocket with auto-reconnect (exponential backoff). */
export function useChatSocket(onEvent: (e: WsEvent) => void) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let stop = false, retry = 0, timer: any;
    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(`${WS_URL}/?token=${encodeURIComponent(getToken())}`);
      wsRef.current = ws;
      ws.onopen = () => { retry = 0; setStatus("open"); };
      ws.onmessage = (ev) => { try { handler.current(JSON.parse(ev.data)); } catch {} };
      ws.onclose = (ev) => {
        setStatus("closed");
        if (stop || ev.code === 4401) return; // 4401 = bad token, don't loop
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 15000));
      };
    };
    connect();
    return () => { stop = true; clearTimeout(timer); wsRef.current?.close(); };
  }, []);

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  return { status, send };
}
