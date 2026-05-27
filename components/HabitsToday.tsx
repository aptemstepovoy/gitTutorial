"use client";

import Link from "next/link";
import { useHabits, useHabitLog } from "@/lib/store";
import { isDueOn, isDone, toggleHabit, ymd } from "@/lib/habits";

export default function HabitsToday() {
  const [habits] = useHabits();
  const [log, setLog] = useHabitLog();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);

  const dueAll = habits.filter((h) => !h.archived && isDueOn(h, today));
  const pending = dueAll.filter((h) => !isDone(log, h.id, todayStr));
  const doneCount = dueAll.length - pending.length;

  if (dueAll.length === 0) {
    return (
      <section className="card mb-4">
        <div className="flex items-center justify-between">
          <span className="label">Привычки сегодня</span>
          <Link href="/habits" className="text-xs text-accent">+ добавить</Link>
        </div>
        <div className="text-sm text-muted mt-2">
          На сегодня привычек нет. Открой <Link href="/habits" className="text-accent">Привычки</Link>.
        </div>
      </section>
    );
  }

  return (
    <section className="card mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label">Привычки сегодня · {doneCount}/{dueAll.length}</span>
        <Link href="/habits" className="text-xs text-muted hover:text-ink">все →</Link>
      </div>

      {pending.length === 0 ? (
        <div className="text-sm text-accent">Все привычки на сегодня выполнены 🎯</div>
      ) : (
        <div className="space-y-2">
          {pending.map((h) => (
            <button
              key={h.id}
              onClick={() => setLog((l) => toggleHabit(l, h.id, todayStr))}
              className="w-full flex items-center gap-3 rounded-xl bg-panel2 border border-line px-3 py-2.5 hover:bg-line active:scale-[0.99] transition text-left"
            >
              <span className="h-9 w-9 rounded-lg bg-panel border border-line flex items-center justify-center text-lg">{h.icon}</span>
              <span className="flex-1 truncate">{h.title}</span>
              <span className="chk" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
