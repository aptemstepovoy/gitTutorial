"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import TaskModal, { TaskDraft, emptyTaskDraft } from "@/components/TaskModal";
import { STEPS, PRINCIPLES, PLAN_META, RISKS, type Task } from "@/lib/plan-data";
import {
  useTasks,
  useCustomTasks,
  useTaskOverrides,
  type CustomTask,
} from "@/lib/store";
import { fmtDate } from "@/lib/date";

// Объединённая задача для UI: что из плана + что добавил пользователь.
type MergedTask = Task & { source: "plan" | "custom"; start?: string; due?: string; outcome?: string };

function PlanPageInner() {
  const [tasks, setTasks] = useTasks();
  const [custom, setCustom] = useCustomTasks();
  const [overrides, setOverrides] = useTaskOverrides();

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    STEPS.forEach((s) => (o[s.id] = ["S1", "S1.1", "S2", "S2.1"].includes(s.id)));
    return o;
  });
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const search = useSearchParams();
  const router = useRouter();

  // Открыть модалку при ?new=1 (из FAB)
  useEffect(() => {
    if (search.get("new") === "1") {
      setDraft(emptyTaskDraft());
      setModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      router.replace(url.pathname + url.search);
    }
  }, [search, router]);

  const toggle = (id: string) => {
    setTasks((p) => ({
      ...p,
      [id]: { ...(p[id] || { done: false }), done: !p[id]?.done, doneAt: !p[id]?.done ? new Date().toISOString() : undefined },
    }));
  };

  const merged = useMemo(() => {
    const out: Record<string, MergedTask[]> = {};
    STEPS.forEach((s) => {
      const planTasks: MergedTask[] = s.tasks
        .filter((t) => !overrides[t.id]?.hidden)
        .map((t) => ({
          ...t,
          source: "plan" as const,
          start: overrides[t.id]?.start ?? t.start,
          due: overrides[t.id]?.due ?? t.due,
          outcome: overrides[t.id]?.outcome ?? t.outcome,
        }));
      const cTasks: MergedTask[] = custom
        .filter((c) => c.stepId === s.id)
        .map((c) => ({
          id: c.id,
          title: c.title,
          start: c.start,
          due: c.due,
          outcome: c.outcome,
          source: "custom" as const,
        }));
      out[s.id] = [...planTasks, ...cTasks].sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9"));
    });
    // Inbox для кастомных без шага
    out["inbox"] = custom
      .filter((c) => c.stepId === "inbox")
      .map((c) => ({
        id: c.id,
        title: c.title,
        start: c.start,
        due: c.due,
        outcome: c.outcome,
        source: "custom" as const,
      }));
    return out;
  }, [custom, overrides]);

  const counts = useMemo(() => {
    const c: Record<string, { done: number; total: number }> = {};
    STEPS.forEach((s) => {
      const list = merged[s.id] ?? [];
      c[s.id] = { total: list.length, done: list.filter((t) => tasks[t.id]?.done).length };
    });
    c["inbox"] = { total: merged["inbox"]?.length ?? 0, done: (merged["inbox"] ?? []).filter((t) => tasks[t.id]?.done).length };
    return c;
  }, [merged, tasks]);

  const openEdit = (t: MergedTask, stepId: string) => {
    setDraft({
      id: t.id,
      source: t.source,
      stepId,
      title: t.title,
      start: t.start ?? "",
      due: t.due ?? "",
      outcome: t.outcome ?? "",
    });
    setModalOpen(true);
  };
  const openNew = (stepId = "") => {
    setDraft(emptyTaskDraft(stepId));
    setModalOpen(true);
  };

  const save = (d: TaskDraft) => {
    if (d.source === "new") {
      const ct: CustomTask = {
        id: "ct_" + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        stepId: d.stepId,
        title: d.title.trim(),
        start: d.start,
        due: d.due,
        outcome: d.outcome.trim(),
        createdAt: new Date().toISOString(),
      };
      setCustom([...custom, ct]);
    } else if (d.source === "custom") {
      setCustom(custom.map((c) => (c.id === d.id ? { ...c, stepId: d.stepId, title: d.title.trim(), start: d.start, due: d.due, outcome: d.outcome.trim() } : c)));
    } else if (d.source === "plan" && d.id) {
      setOverrides({ ...overrides, [d.id]: { ...overrides[d.id], start: d.start, due: d.due, outcome: d.outcome.trim() } });
    }
    setModalOpen(false);
  };

  const remove = () => {
    if (!draft || !draft.id) return;
    if (!confirm(draft.source === "plan" ? "Скрыть плановую задачу из списка?" : "Удалить задачу?")) return;
    if (draft.source === "plan") {
      setOverrides({ ...overrides, [draft.id]: { ...overrides[draft.id], hidden: true } });
    } else {
      setCustom(custom.filter((c) => c.id !== draft.id));
    }
    setModalOpen(false);
  };

  const renderStep = (id: string, title: string, goal: string, list: MergedTask[], extra?: React.ReactNode) => {
    const c = counts[id] ?? { done: 0, total: 0 };
    const visible = list.filter((t) => {
      const done = !!tasks[t.id]?.done;
      if (filter === "done") return done;
      if (filter === "open") return !done;
      return true;
    });
    return (
      <div key={id} className="card">
        <button onClick={() => setOpen((p) => ({ ...p, [id]: !p[id] }))} className="w-full text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-muted">{c.done}/{c.total}</div>
          </div>
          {goal && <div className="text-sm text-muted mt-1">{goal}</div>}
          <div className="progress mt-2"><div style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></div>
        </button>

        {open[id] && (
          <div className="mt-3 space-y-2">
            {extra}
            {visible.map((t) => {
              const done = !!tasks[t.id]?.done;
              return (
                <div key={t.id} className="card-sm flex items-start gap-3">
                  <button onClick={() => toggle(t.id)} className={"chk mt-0.5 " + (done ? "chk-on" : "")} />
                  <button onClick={() => openEdit(t, id)} className="flex-1 text-left min-w-0">
                    <div className={"font-medium " + (done ? "line-through text-muted" : "")}>{t.title}</div>
                    <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-2">
                      {t.start && <span>старт {fmtDate(t.start)}</span>}
                      {t.due && <span>· до {fmtDate(t.due)}</span>}
                      {t.source === "custom" && <span className="text-accent">· custom</span>}
                    </div>
                    {t.outcome && <div className="text-xs text-muted mt-0.5">→ {t.outcome}</div>}
                  </button>
                </div>
              );
            })}
            <button onClick={() => openNew(id)} className="btn-ghost w-full text-sm py-2 mt-1">
              + Добавить задачу в {id}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Header title="План" sub={`${fmtDate(PLAN_META.start)} → ${fmtDate(PLAN_META.end)} · точка пересборки ${fmtDate(PLAN_META.rebuildAt)}`} />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-2 flex-1 overflow-auto -mx-4 px-4">
          {(["all", "open", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`tag ${filter === f ? "tag-on" : ""}`}>
              {f === "all" ? "Все" : f === "open" ? "Открытые" : "Выполнено"}
            </button>
          ))}
        </div>
        <button onClick={() => openNew("")} className="btn-primary text-sm whitespace-nowrap">+ Задача</button>
      </div>

      <div className="space-y-3 mb-6">
        {STEPS.map((s) =>
          renderStep(
            s.id,
            s.title,
            s.goal,
            merged[s.id] ?? [],
            <>
              {(s.start || s.due) && (
                <div className="text-xs text-muted">
                  {s.start && <>старт {fmtDate(s.start)} · </>}
                  {s.due && <>дедлайн {fmtDate(s.due)}</>}
                  {s.buffer && <> · буфер до {fmtDate(s.buffer)}</>}
                </div>
              )}
              {s.notes?.map((n, i) => (
                <div key={i} className="text-xs text-muted bg-panel2 rounded-lg px-3 py-2 border border-line">{n}</div>
              ))}
            </>
          )
        )}

        {(merged["inbox"]?.length ?? 0) > 0 &&
          renderStep("inbox", "Inbox", "Задачи без шага.", merged["inbox"])}
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

      <TaskModal
        open={modalOpen}
        draft={draft}
        onClose={() => setModalOpen(false)}
        onSave={save}
        onDelete={draft && draft.source !== "new" ? remove : undefined}
      />
    </>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanPageInner />
    </Suspense>
  );
}
