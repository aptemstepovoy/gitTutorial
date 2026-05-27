"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase, SYNC_ENABLED } from "@/lib/supabase";

// Ключи, которые синхронизируем между устройствами.
const KEYS = [
  "reboot:tasks",
  "reboot:daily",
  "reboot:reflections",
  "reboot:insights",
  "reboot:weight",
  "reboot:theme",
];

type Status = "off" | "loading" | "ok" | "error";

export default function SyncProvider() {
  const [status, setStatus] = useState<Status>(SYNC_ENABLED ? "loading" : "off");
  const [msg, setMsg] = useState<string>("");
  const pending = useRef<Record<string, NodeJS.Timeout>>({});

  // hydrate on mount
  useEffect(() => {
    if (!SYNC_ENABLED) return;
    const client = getSupabase();
    if (!client) return;

    (async () => {
      try {
        const { data, error } = await client.from("kv").select("id, value, updated_at").in("id", KEYS);
        if (error) throw error;
        const localTouched: string[] = [];
        for (const row of data ?? []) {
          // если в localStorage уже что-то лежит — мержим по правилу "новее побеждает", но JSON хранилище не знает время.
          // Стратегия: при первом коннекте берём данные с сервера; локальные записи идут поверх через write-events.
          window.localStorage.setItem(row.id, JSON.stringify(row.value));
          localTouched.push(row.id);
        }
        setStatus("ok");
        setMsg(localTouched.length ? `Загружено: ${localTouched.length}` : "Пусто на сервере");
        // Подсказка приложению перезагрузить состояние
        window.dispatchEvent(new CustomEvent("reboot:sync-hydrated"));
        setTimeout(() => setMsg(""), 1500);
      } catch (e: any) {
        console.error("[sync] hydrate failed", e);
        setStatus("error");
        setMsg(e.message ?? "ошибка");
      }
    })();
  }, []);

  // listen to write events and push to server with small debounce per-key
  useEffect(() => {
    if (!SYNC_ENABLED) return;
    const client = getSupabase();
    if (!client) return;

    const onWrite = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: unknown }>).detail;
      if (!detail || !KEYS.includes(detail.key)) return;
      clearTimeout(pending.current[detail.key]);
      pending.current[detail.key] = setTimeout(async () => {
        try {
          const { error } = await client.from("kv").upsert(
            { id: detail.key, value: detail.value, updated_at: new Date().toISOString() },
            { onConflict: "id" }
          );
          if (error) throw error;
          setStatus("ok");
        } catch (err: any) {
          console.error("[sync] push failed", err);
          setStatus("error");
          setMsg(err.message ?? "push failed");
        }
      }, 600);
    };

    window.addEventListener("reboot:write", onWrite as EventListener);
    return () => window.removeEventListener("reboot:write", onWrite as EventListener);
  }, []);

  if (!SYNC_ENABLED) return null;

  return (
    <div className="fixed top-2 right-2 z-40 text-[10px] pointer-events-none">
      <span
        className={
          "px-2 py-0.5 rounded-full border " +
          (status === "ok"
            ? "border-accent/40 text-accent"
            : status === "loading"
              ? "border-line text-muted"
              : status === "error"
                ? "border-danger/40 text-danger"
                : "hidden")
        }
        title={msg}
      >
        {status === "ok" ? "sync ✓" : status === "loading" ? "sync…" : "sync ✗"}
      </span>
    </div>
  );
}
