import type { Habit, HabitLog } from "./store";

export const DOW_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
// Понедельник как старт недели для отображения
export const DOW_SHORT_MON = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isDueOn(habit: Habit, date: Date): boolean {
  if (habit.archived) return false;
  const created = parseYmd(habit.createdAt.slice(0, 10));
  if (date < created) return false;
  const dow = date.getDay(); // 0..6
  switch (habit.frequency) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekends": return dow === 0 || dow === 6;
    case "weekly": return !!habit.daysOfWeek?.includes(dow);
  }
}

export function isDone(log: HabitLog, habitId: string, date: string): boolean {
  return !!log[date]?.[habitId];
}

export function toggleHabit(log: HabitLog, habitId: string, date: string): HabitLog {
  const day = { ...(log[date] ?? {}) };
  if (day[habitId]) delete day[habitId];
  else day[habitId] = true;
  const next = { ...log };
  if (Object.keys(day).length === 0) delete next[date];
  else next[date] = day;
  return next;
}

// Стрик: считаем подряд идущие "запланированные" дни, начиная с сегодня (или с последнего due-дня), где привычка отмечена.
// Пропуск выпадающего из расписания дня — не ломает стрик.
export function streak(habit: Habit, log: HabitLog, today: Date): number {
  let count = 0;
  const cursor = new Date(today);
  // Если сегодня не due и не отмечен — начинаем с ближайшего предыдущего due-дня
  for (let i = 0; i < 1000; i++) {
    if (isDueOn(habit, cursor)) {
      if (isDone(log, habit.id, ymd(cursor))) {
        count++;
      } else {
        // если это сегодня и ещё не отмечено — продолжаем смотреть вчера, не ломаем
        if (i === 0 && cursor.toDateString() === today.toDateString()) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function longestStreak(habit: Habit, log: HabitLog, today: Date): number {
  // Считаем все стрики в истории
  const created = parseYmd(habit.createdAt.slice(0, 10));
  let best = 0, current = 0;
  const cursor = new Date(created);
  while (cursor <= today) {
    if (isDueOn(habit, cursor)) {
      if (isDone(log, habit.id, ymd(cursor))) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

// % выполнения за период (от created до today)
export function completionRate(habit: Habit, log: HabitLog, today: Date, days = 30): number {
  let due = 0, done = 0;
  const cursor = new Date(today);
  for (let i = 0; i < days; i++) {
    if (isDueOn(habit, cursor)) {
      due++;
      if (isDone(log, habit.id, ymd(cursor))) done++;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return due === 0 ? 0 : Math.round((done / due) * 100);
}

export function lastDays(today: Date, n: number): Date[] {
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export const FREQ_LABEL: Record<Habit["frequency"], string> = {
  daily: "Каждый день",
  weekdays: "Будни (Пн–Пт)",
  weekends: "Выходные",
  weekly: "По дням недели",
};

export const HABIT_ICON_PRESETS = ["💧", "🏃", "🧘", "📚", "🇬🇧", "✍️", "🥗", "💪", "😴", "🚶", "🧹", "📵", "☕", "🧠", "🎯", "🔥", "📞", "🧴", "💊", "🪥"];
