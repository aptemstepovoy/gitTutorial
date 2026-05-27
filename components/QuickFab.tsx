"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS = [
  { key: "report", label: "Отчёт за день", icon: "✎", href: "/daily" },
  { key: "insight", label: "Записать инсайт", icon: "✦", href: "/insights?new=1" },
  { key: "task", label: "Добавить задачу", icon: "＋", href: "/plan?new=1" },
  { key: "habit", label: "Добавить привычку", icon: "✓", href: "/habits?new=1" },
];

export default function QuickFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      <div
        className="fixed right-4 z-50 flex flex-col items-end gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
      >
        {open && (
          <div className="flex flex-col items-end gap-2 mb-1">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => {
                  setOpen(false);
                  router.push(a.href);
                }}
                className="flex items-center gap-2 bg-panel border border-line rounded-full pl-4 pr-3 py-2 shadow-lg hover:bg-line"
              >
                <span className="text-sm">{a.label}</span>
                <span className="h-7 w-7 rounded-full bg-panel2 flex items-center justify-center text-base">{a.icon}</span>
              </button>
            ))}
          </div>
        )}
        <button
          aria-label="Быстрые действия"
          onClick={() => setOpen((v) => !v)}
          className={
            "h-14 w-14 rounded-full bg-accent text-black text-3xl leading-none font-light shadow-xl border-2 border-black/20 transition active:scale-95 " +
            (open ? "rotate-45" : "")
          }
        >
          +
        </button>
      </div>
    </>
  );
}
