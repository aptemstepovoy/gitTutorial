"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { STEPS, PRINCIPLES, PLAN_META, RISKS } from "@/lib/plan-data";
import { useTasks } from "@/lib/store";
import { fmtDate } from "@/lib/date";

export default function PlanPage() {
  const [tasks, setTasks] = useTasks();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    STEPS.forEach((s) => (o[s.id] = ["S1", "S1.1", "S2", "S2.1"].includes(s.id)));
    return o;
  });
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const toggle = (id: string) => {
    setTasks((p) => ({ ...p, [id]: { ...(p[id] || { done: false }), done: !p[id]?.done, doneAt: !p[id]?.done ? new Date().toISOString() : undefined } }));
  };

  const counts = useMemo(() => {
    const c: Record<string, { done: number; total: number }> = {};
    STEPS.forEach((s) => {
      const total = s.tasks.length;
      const done = s.tasks.filter((t) => tasks[t.id]?.done).length;
      c[s.id] = { done, total };
    });
    return c;
  }, [tasks]);

  return (
    <>
      <Header title="План" sub={`${fmtDate(PLAN_META.start)} → ${fmtDate(PLAN_META.end)} · точка пересборки ${fmtDate(PLAN_META.rebuildAt)}`} />

      <div className="flex gap-2 mb-4 overflow-auto -mx-4 px-4">
        {(["all", "open", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`tag ${filter === f ? "tag-on" : ""}`}
          >
            {f === "all" ? "Все" : f === "open" ? "Открытые" : "Выполнено"}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        {STEPS.map((s) => {
          const c = counts[s.id];
          const visible = s.tasks.filter((t) => {
            const done = !!tasks[t.id]?.done;
            if (filter === "done") return done;
            if (filter === "open") return !done;
            return true;
          });
          return (
            <div key={s.id} className="card">
              <button
                onClick={() => setOpen((p) => ({ ...p, [s.id]: !p[s.id] }))}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-xs text-muted">
                    {c.done}/{c.total}
                  </div>
                </div>
                <div className="text-sm text-muted mt-1">{s.goal}</div>
                {(s.start || s.due) && (
                  <div className="text-xs text-muted mt-1">
                    {s.start && <>старт {fmtDate(s.start)} · </>}
                    {s.due && <>дедлайн {fmtDate(s.due)}</>}
                    {s.buffer && <> · буфер до {fmtDate(s.buffer)}</>}
                  </div>
                )}
                <div className="progress mt-2"><div style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></div>
              </button>

              {open[s.id] && (
                <div className="mt-3 space-y-2">
                  {s.notes?.map((n, i) => (
                    <div key={i} className="text-xs text-muted bg-panel2 rounded-lg px-3 py-2 border border-line">{n}</div>
                  ))}
                  {visible.map((t) => {
                    const done = !!tasks[t.id]?.done;
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggle(t.id)}
                        className="card-sm w-full flex items-start gap-3 text-left"
                      >
                        <span className={"chk mt-0.5 " + (done ? "chk-on" : "")} />
                        <span className="flex-1">
                          <span className={"block " + (done ? "line-through text-muted" : "")}>{t.title}</span>
                          <span className="text-xs text-muted">
                            {t.id}
                            {t.due && <> · до {fmtDate(t.due)}</>}
                            {t.outcome && <> · {t.outcome}</>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <details className="card mb-3">
        <summary className="cursor-pointer font-semibold">Принципы (что НЕ делаем)</summary>
        <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
          {PRINCIPLES.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      </details>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Риски и митигации</summary>
        <div className="mt-2 space-y-2 text-sm">
          {RISKS.map((r, i) => (
            <div key={i} className="border-b border-line last:border-0 pb-2">
              <div className="flex justify-between gap-3">
                <div className="font-medium">{r.risk}</div>
                <div className="text-xs text-muted">{r.p}</div>
              </div>
              <div className="text-xs text-muted">{r.mitigation}</div>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
