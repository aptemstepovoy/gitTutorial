"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import HabitModal, { type HabitDraft, emptyHabitDraft, habitToDraft } from "@/components/HabitModal";
import { useHabits, useHabitLog, type Habit } from "@/lib/store";
import {
  isDueOn,
  isDone,
  toggleHabit,
  streak,
  longestStreak,
  completionRate,
  ymd,
  lastDays,
  FREQ_LABEL,
  DOW_SHORT_MON,
} from "@/lib/habits";

function HabitsPageInner() {
  const [habits, setHabits] = useHabits();
  const [log, setLog] = useHabitLog();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<HabitDraft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const search = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (search.get("new") === "1") {
      setDraft(emptyHabitDraft());
      setModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      router.replace(url.pathname + url.search);
    }
  }, [search, router]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = habits.filter((h) => !h.archived);

  const summary = useMemo(() => {
    const dueToday = active.filter((h) => isDueOn(h, today));
    const doneToday = dueToday.filter((h) => isDone(log, h.id, ymd(today))).length;
    const best = active.reduce((m, h) => Math.max(m, streak(h, log, today)), 0);
    return { total: active.length, dueToday: dueToday.length, doneToday, best };
  }, [active, log, today]);

  const openNew = () => {
    setDraft(emptyHabitDraft());
    setModalOpen(true);
  };
  const openEdit = (h: Habit) => {
    setDraft(habitToDraft(h));
    setModalOpen(true);
  };

  const save = (d: HabitDraft) => {
    if (d.id) {
      setHabits(habits.map((h) => (h.id === d.id ? { ...h, title: d.title, icon: d.icon, frequency: d.frequency, daysOfWeek: d.daysOfWeek, note: d.note } : h)));
    } else {
      const h: Habit = {
        id: "hb_" + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        title: d.title,
        icon: d.icon,
        frequency: d.frequency,
        daysOfWeek: d.daysOfWeek,
        note: d.note,
        createdAt: new Date().toISOString(),
      };
      setHabits([...habits, h]);
    }
    setModalOpen(false);
  };

  const remove = () => {
    if (!draft?.id) return;
    if (!confirm("Удалить привычку и всю историю по ней?")) return;
    setHabits(habits.filter((h) => h.id !== draft.id));
    // подчистим лог
    const next: typeof log = {};
    for (const [day, m] of Object.entries(log)) {
      const filtered = { ...m };
      delete filtered[draft.id];
      if (Object.keys(filtered).length) next[day] = filtered;
    }
    setLog(next);
    setModalOpen(false);
  };

  const toggle = (h: Habit, date: string) => {
    setLog((l) => toggleHabit(l, h.id, date));
  };

  return (
    <>
      <Header
        title="Привычки"
        sub={<>Дисциплина — это <span className="kicker-amber">маленькие действия</span>, повторённые системно.</>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Всего" value={summary.total} />
        <Stat label="На сегодня" value={`${summary.doneToday}/${summary.dueToday}`} />
        <Stat label="Лучший стрик" value={`${summary.best} 🔥`} />
        <Stat label="За 30 дн." value={`${overallRate(active, log, today)}%`} />
      </div>

      <div className="flex justify-end mb-3">
        <button onClick={openNew} className="btn-primary px-5">+ Привычка</button>
      </div>

      {active.length === 0 && (
        <div className="card text-sm text-muted">
          Пока нет привычек. Начни с одной — например, «Тренировка 3×/неделю» или «Английский 30 мин».
        </div>
      )}

      <div className="space-y-3">
        {active.map((h) => {
          const week = lastDays(today, 7);
          const cur = streak(h, log, today);
          const best = longestStreak(h, log, today);
          const rate = completionRate(h, log, today, 30);
          const isOpen = openId === h.id;
          return (
            <div key={h.id} className="card">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(h, ymd(today))}
                  className={
                    "h-12 w-12 rounded-2xl flex items-center justify-center text-2xl border " +
                    (isDone(log, h.id, ymd(today)) ? "bg-accent/20 border-accent" : "bg-panel2 border-line hover:bg-line")
                  }
                  title={isDueOn(h, today) ? "Отметить сегодня" : "Сегодня не по расписанию — можно всё равно отметить"}
                >
                  {h.icon}
                </button>
                <button onClick={() => setOpenId(isOpen ? null : h.id)} className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{h.title}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {FREQ_LABEL[h.frequency]}
                    {h.frequency === "weekly" && h.daysOfWeek?.length ? ` · ${h.daysOfWeek.map((d) => DOW_SHORT_MON[(d + 6) % 7]).join(", ")}` : ""}
                  </div>
                </button>
                <div className="text-right">
                  <div className="text-sm">🔥 {cur}</div>
                  <div className="text-[11px] text-muted">{rate}%</div>
                </div>
              </div>

              {/* Неделя */}
              <div className="grid grid-cols-7 gap-1 mt-3">
                {week.map((d) => {
                  const due = isDueOn(h, d);
                  const done = isDone(log, h.id, ymd(d));
                  const isToday = d.toDateString() === today.toDateString();
                  return (
                    <button
                      key={ymd(d)}
                      onClick={() => toggle(h, ymd(d))}
                      className={
                        "py-2 rounded-lg text-[11px] border flex flex-col items-center gap-0.5 " +
                        (done
                          ? "bg-accent/20 border-accent text-accent"
                          : due
                            ? "bg-panel2 border-line text-muted hover:bg-line"
                            : "bg-panel2/40 border-line/60 text-muted/60") +
                        (isToday ? " ring-1 ring-fuchsia-400/50" : "")
                      }
                    >
                      <span>{DOW_SHORT_MON[(d.getDay() + 6) % 7]}</span>
                      <span className="text-[10px]">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-line space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat sm label="Сейчас" value={`${cur} 🔥`} />
                    <Stat sm label="Лучший" value={`${best}`} />
                    <Stat sm label="30 дн." value={`${rate}%`} />
                  </div>

                  {/* Heatmap последних 90 дней */}
                  <div>
                    <div className="label mb-2">90 дней</div>
                    <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: "minmax(0,1fr)" }}>
                      {lastDays(today, 91).map((d) => {
                        const due = isDueOn(h, d);
                        const done = isDone(log, h.id, ymd(d));
                        const c = done
                          ? "bg-accent"
                          : due
                            ? "bg-panel2 border border-line"
                            : "bg-panel2/30";
                        return <div key={ymd(d)} className={"aspect-square rounded-sm " + c} title={`${ymd(d)} · ${done ? "done" : due ? "due" : "off"}`} />;
                      })}
                    </div>
                  </div>

                  {h.note && (
                    <div className="text-sm text-muted whitespace-pre-wrap bg-panel2 border border-line rounded-lg p-3">{h.note}</div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(h)} className="btn flex-1">Редактировать</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <HabitModal
        open={modalOpen}
        draft={draft}
        onClose={() => setModalOpen(false)}
        onSave={save}
        onDelete={draft?.id ? remove : undefined}
      />
    </>
  );
}

function Stat({ label, value, sm }: { label: string; value: number | string; sm?: boolean }) {
  return (
    <div className={sm ? "card-sm" : "card"}>
      <div className="label">{label}</div>
      <div className={(sm ? "text-xl" : "text-3xl") + " font-semibold mt-1"}>{value}</div>
    </div>
  );
}

function overallRate(active: Habit[], log: import("@/lib/store").HabitLog, today: Date): number {
  if (!active.length) return 0;
  let due = 0, done = 0;
  const cursor = new Date(today);
  for (let i = 0; i < 30; i++) {
    for (const h of active) {
      if (isDueOn(h, cursor)) {
        due++;
        if (isDone(log, h.id, ymd(cursor))) done++;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return due === 0 ? 0 : Math.round((done / due) * 100);
}

export default function HabitsPage() {
  return (
    <Suspense fallback={null}>
      <HabitsPageInner />
    </Suspense>
  );
}
