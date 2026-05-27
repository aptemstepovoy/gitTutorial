"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import TaskModal, { TaskDraft } from "@/components/TaskModal";
import { PLAN_META, STEPS, targetWeight } from "@/lib/plan-data";
import {
  useTasks,
  useWeights,
  useDailyReports,
  useCustomTasks,
  useTaskOverrides,
  today,
  type CustomTask,
} from "@/lib/store";
import { daysBetween, ruDateLong, fmtDate } from "@/lib/date";

type TaskItem = {
  tid: string;
  stepId: string;
  stepTitle: string;
  title: string;
  start: string;
  due: string;
  outcome: string;
  source: "plan" | "custom";
};

export default function TodayPage() {
  const [tasks, setTasks] = useTasks();
  const [weights] = useWeights();
  const [reports] = useDailyReports();
  const [custom, setCustom] = useCustomTasks();
  const [overrides, setOverrides] = useTaskOverrides();

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const now = new Date();
  const startD = new Date(PLAN_META.start);
  const endD = new Date(PLAN_META.end);
  const totalDays = daysBetween(startD, endD);
  const passed = Math.max(0, daysBetween(startD, now));
  const left = Math.max(0, daysBetween(now, endD));
  const progressPct = Math.min(100, Math.max(0, Math.round((passed / totalDays) * 100)));

  const lastWeight = weights.length ? weights[weights.length - 1] : null;
  const wTarget = targetWeight(now);

  const todayStr = today();
  const in14 = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);

  const { overdue, hot } = useMemo(() => {
    const overdue: TaskItem[] = [];
    const hot: TaskItem[] = [];
    STEPS.forEach((s) =>
      s.tasks.forEach((t) => {
        const ov = overrides[t.id];
        if (ov?.hidden) return;
        const due = ov?.due ?? t.due;
        if (!due) return;
        if (tasks[t.id]?.done) return;
        const row: TaskItem = {
          tid: t.id,
          stepId: s.id,
          stepTitle: s.title,
          title: t.title,
          start: ov?.start ?? t.start ?? "",
          due,
          outcome: ov?.outcome ?? t.outcome ?? "",
          source: "plan",
        };
        if (due < todayStr) overdue.push(row);
        else if (due <= in14) hot.push(row);
      })
    );
    custom.forEach((c) => {
      if (tasks[c.id]?.done) return;
      const stepTitle = STEPS.find((s) => s.id === c.stepId)?.title ?? "Inbox";
      const row: TaskItem = {
        tid: c.id,
        stepId: c.stepId,
        stepTitle,
        title: c.title,
        start: c.start,
        due: c.due,
        outcome: c.outcome,
        source: "custom",
      };
      if (c.due < todayStr) overdue.push(row);
      else if (c.due <= in14) hot.push(row);
    });
    overdue.sort((a, b) => a.due.localeCompare(b.due));
    hot.sort((a, b) => a.due.localeCompare(b.due));
    return { overdue, hot };
  }, [tasks, custom, overrides, todayStr, in14]);

  const reportToday = reports[todayStr];

  const toggle = (id: string) => {
    setTasks((p) => ({
      ...p,
      [id]: {
        ...(p[id] || { done: false }),
        done: !p[id]?.done,
        doneAt: !p[id]?.done ? new Date().toISOString() : undefined,
      },
    }));
  };

  const openEdit = (t: TaskItem) => {
    setDraft({
      id: t.tid,
      source: t.source,
      stepId: t.stepId,
      title: t.title,
      start: t.start,
      due: t.due,
      outcome: t.outcome,
    });
    setModalOpen(true);
  };

  const save = (d: TaskDraft) => {
    if (d.source === "custom" && d.id) {
      setCustom(
        custom.map((c) =>
          c.id === d.id
            ? { ...c, stepId: d.stepId, title: d.title.trim(), start: d.start, due: d.due, outcome: d.outcome.trim() }
            : c
        )
      );
    } else if (d.source === "plan" && d.id) {
      setOverrides({
        ...overrides,
        [d.id]: { ...overrides[d.id], start: d.start, due: d.due, outcome: d.outcome.trim() },
      });
    } else if (d.source === "new") {
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

  const heroPick = overdue[0] ?? hot[0];

  return (
    <>
      <Header
        title={ruDateLong(now).replace(/^./, (c) => c.toUpperCase())}
        sub={`До цели: ${left} дн.  ·  Тема года: ${PLAN_META.themeCandidates[0]}`}
      />

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label">Прогресс года</span>
          <span className="text-sm">{progressPct}% · {passed} / {totalDays} дн.</span>
        </div>
        <div className="progress"><div style={{ width: `${progressPct}%` }} /></div>
      </div>

      {heroPick ? (
        <div className="card mb-4 border-accent/40">
          <div className="label mb-1">Следующий шаг</div>
          <div className="flex items-start gap-3">
            <button onClick={() => toggle(heroPick.tid)} className="chk mt-1" aria-label="done" />
            <button onClick={() => openEdit(heroPick)} className="flex-1 text-left min-w-0">
              <div className="text-lg font-semibold leading-snug">{heroPick.title}</div>
              <div className="text-xs text-muted mt-1">
                {heroPick.tid} · {heroPick.stepTitle} · дедлайн {fmtDate(heroPick.due)}
              </div>
              {heroPick.outcome && <div className="text-xs text-muted mt-1">→ {heroPick.outcome}</div>}
            </button>
          </div>
        </div>
      ) : (
        <div className="card mb-4">
          <div className="label">Следующий шаг</div>
          <div className="mt-1">Нет горящих задач. Открой <Link className="text-accent underline" href="/plan">план</Link>.</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card-sm">
          <div className="label">Вес сегодня</div>
          {lastWeight ? (
            <div className="mt-1">
              <div className="text-xl font-semibold">{lastWeight.weight} <span className="text-muted text-base">кг</span></div>
              <div className="text-xs text-muted">target: {wTarget.toFixed(1)} ({(lastWeight.weight - wTarget >= 0 ? "+" : "")}{(lastWeight.weight - wTarget).toFixed(1)})</div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted">Запиши первый вес → <Link className="text-accent" href="/metrics">Метрики</Link></div>
          )}
        </div>
        <div className="card-sm">
          <div className="label">Сегодняшний отчёт</div>
          {reportToday ? (
            <div className="mt-1">
              <div className="text-xl font-semibold">{reportToday.focus}<span className="text-muted text-base">%</span></div>
              <div className="text-xs text-muted">фокус · энергия {reportToday.energy}/5</div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted">Не заполнен → <Link className="text-accent" href="/daily">заполнить</Link></div>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <section className="mb-4">
          <h2 className="label mb-2">Просрочено ({overdue.length})</h2>
          <div className="space-y-2">
            {overdue.slice(0, 6).map((t) => (
              <TaskRow key={t.tid} t={t} danger onToggle={toggle} onEdit={openEdit} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h2 className="label mb-2">Ближайшие 14 дней ({hot.length})</h2>
        <div className="space-y-2">
          {hot.slice(0, 8).map((t) => (
            <TaskRow key={t.tid} t={t} onToggle={toggle} onEdit={openEdit} />
          ))}
          {hot.length === 0 && <div className="text-sm text-muted">Пусто.</div>}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/daily" className="btn-primary">Отчёт за день</Link>
        <Link href="/insights" className="btn">+ Инсайт</Link>
      </div>

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

function TaskRow({
  t,
  danger,
  onToggle,
  onEdit,
}: {
  t: TaskItem;
  danger?: boolean;
  onToggle: (id: string) => void;
  onEdit: (t: TaskItem) => void;
}) {
  return (
    <div className={"card-sm flex items-start gap-3 " + (danger ? "border-danger/30" : "")}>
      <button onClick={() => onToggle(t.tid)} className="chk mt-0.5" aria-label="done" />
      <button onClick={() => onEdit(t)} className="flex-1 text-left min-w-0">
        <div className="block">{t.title}</div>
        <div className={"text-xs mt-0.5 " + (danger ? "text-danger" : "text-muted")}>
          {danger ? "просрочено " : ""}
          {fmtDate(t.due)} · {t.tid}
          {!danger && <> · {t.stepTitle}</>}
        </div>
      </button>
    </div>
  );
}
