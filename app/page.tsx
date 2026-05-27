"use client";

import { useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { PLAN_META, STEPS, targetWeight } from "@/lib/plan-data";
import { useTasks, useWeights, useDailyReports, useCustomTasks, useTaskOverrides, today } from "@/lib/store";
import { daysBetween, ruDateLong, fmtDate } from "@/lib/date";

export default function TodayPage() {
  const [tasks, setTasks] = useTasks();
  const [weights] = useWeights();
  const [reports] = useDailyReports();
  const [custom] = useCustomTasks();
  const [overrides] = useTaskOverrides();

  const now = new Date();
  const startD = new Date(PLAN_META.start);
  const endD = new Date(PLAN_META.end);
  const totalDays = daysBetween(startD, endD);
  const passed = Math.max(0, daysBetween(startD, now));
  const left = Math.max(0, daysBetween(now, endD));
  const progressPct = Math.min(100, Math.max(0, Math.round((passed / totalDays) * 100)));

  // Текущий target веса и delta
  const lastWeight = weights.length ? weights[weights.length - 1] : null;
  const wTarget = targetWeight(now);

  // Просроченные и горящие задачи (через 14 дней)
  const todayStr = today();
  const in14 = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);

  const overdue: { stepId: string; stepTitle: string; tid: string; title: string; due: string }[] = [];
  const hot: typeof overdue = [];
  STEPS.forEach((s) =>
    s.tasks.forEach((t) => {
      const ov = overrides[t.id];
      if (ov?.hidden) return;
      const due = ov?.start && ov.due ? ov.due : t.due;
      if (!due) return;
      if (tasks[t.id]?.done) return;
      if (due < todayStr) overdue.push({ stepId: s.id, stepTitle: s.title, tid: t.id, title: t.title, due });
      else if (due <= in14) hot.push({ stepId: s.id, stepTitle: s.title, tid: t.id, title: t.title, due });
    })
  );
  custom.forEach((c) => {
    if (tasks[c.id]?.done) return;
    const stepTitle = STEPS.find((s) => s.id === c.stepId)?.title ?? "Inbox";
    if (c.due < todayStr) overdue.push({ stepId: c.stepId, stepTitle, tid: c.id, title: c.title, due: c.due });
    else if (c.due <= in14) hot.push({ stepId: c.stepId, stepTitle, tid: c.id, title: c.title, due: c.due });
  });
  overdue.sort((a, b) => a.due.localeCompare(b.due));
  hot.sort((a, b) => a.due.localeCompare(b.due));

  const reportToday = reports[todayStr];

  const toggle = (id: string) => {
    setTasks((p) => ({ ...p, [id]: { ...(p[id] || { done: false }), done: !p[id]?.done, doneAt: !p[id]?.done ? new Date().toISOString() : undefined } }));
  };

  const heroPick = useMemo(() => {
    const candidates = [...overdue, ...hot];
    return candidates.slice(0, 1)[0];
  }, [overdue, hot]);

  return (
    <>
      <Header
        title={ruDateLong(now).replace(/^./, (c) => c.toUpperCase())}
        sub={`До цели: ${left} дн.  ·  Тема года: ${PLAN_META.themeCandidates[0]}`}
      />

      {/* Прогресс года */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label">Прогресс года</span>
          <span className="text-sm">{progressPct}% · {passed} / {totalDays} дн.</span>
        </div>
        <div className="progress"><div style={{ width: `${progressPct}%` }} /></div>
      </div>

      {/* Главный фокус */}
      {heroPick ? (
        <div className="card mb-4 border-accent/40">
          <div className="label mb-1">Следующий шаг</div>
          <div className="flex items-start gap-3">
            <button onClick={() => toggle(heroPick.tid)} className="chk mt-1" aria-label="done" />
            <div className="flex-1">
              <div className="text-lg font-semibold leading-snug">{heroPick.title}</div>
              <div className="text-xs text-muted mt-1">
                {heroPick.tid} · {heroPick.stepTitle} · дедлайн {fmtDate(heroPick.due)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mb-4">
          <div className="label">Следующий шаг</div>
          <div className="mt-1">Нет горящих задач. Открой <Link className="text-accent underline" href="/plan">план</Link>.</div>
        </div>
      )}

      {/* Метрики дня */}
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

      {/* Горящее */}
      {overdue.length > 0 && (
        <section className="mb-4">
          <h2 className="label mb-2">Просрочено ({overdue.length})</h2>
          <div className="space-y-2">
            {overdue.slice(0, 6).map((t) => (
              <button
                key={t.tid}
                onClick={() => toggle(t.tid)}
                className="card-sm w-full flex items-start gap-3 text-left hover:border-danger/40"
              >
                <span className="chk mt-0.5" />
                <span className="flex-1">
                  <span className="block">{t.title}</span>
                  <span className="text-xs text-danger">просрочено {fmtDate(t.due)} · {t.tid}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h2 className="label mb-2">Ближайшие 14 дней ({hot.length})</h2>
        <div className="space-y-2">
          {hot.slice(0, 8).map((t) => (
            <button
              key={t.tid}
              onClick={() => toggle(t.tid)}
              className="card-sm w-full flex items-start gap-3 text-left"
            >
              <span className="chk mt-0.5" />
              <span className="flex-1">
                <span className="block">{t.title}</span>
                <span className="text-xs text-muted">{fmtDate(t.due)} · {t.tid} · {t.stepTitle}</span>
              </span>
            </button>
          ))}
          {hot.length === 0 && <div className="text-sm text-muted">Пусто.</div>}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/daily" className="btn-primary">Отчёт за день</Link>
        <Link href="/insights" className="btn">+ Инсайт</Link>
      </div>
    </>
  );
}
