"use client";

import { useEffect, useState } from "react";
import type { Habit, HabitFrequency } from "@/lib/store";
import { FREQ_LABEL, HABIT_ICON_PRESETS, DOW_SHORT_MON } from "@/lib/habits";

export type HabitDraft = {
  id?: string;
  title: string;
  icon: string;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  note?: string;
};

export function emptyHabitDraft(): HabitDraft {
  return {
    title: "",
    icon: "🎯",
    frequency: "daily",
    daysOfWeek: [1, 2, 3, 4, 5],
    note: "",
  };
}

export function habitToDraft(h: Habit): HabitDraft {
  return {
    id: h.id,
    title: h.title,
    icon: h.icon,
    frequency: h.frequency,
    daysOfWeek: h.daysOfWeek ?? [1, 2, 3, 4, 5],
    note: h.note ?? "",
  };
}

// 0..6 где 0 = вс. UI начинаем с понедельника.
const UI_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HabitModal({
  open,
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  draft: HabitDraft | null;
  onClose: () => void;
  onSave: (d: HabitDraft) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<HabitDraft | null>(draft);
  const [err, setErr] = useState("");

  useEffect(() => {
    setD(draft);
    setErr("");
  }, [draft]);

  if (!open || !d) return null;

  const toggleDow = (n: number) => {
    setD({
      ...d,
      daysOfWeek: d.daysOfWeek.includes(n)
        ? d.daysOfWeek.filter((x) => x !== n)
        : [...d.daysOfWeek, n].sort(),
    });
  };

  const submit = () => {
    if (!d.title.trim()) return setErr("Заполни название");
    if (d.frequency === "weekly" && d.daysOfWeek.length === 0)
      return setErr("Выбери хотя бы один день недели");
    onSave({ ...d, title: d.title.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-panel border border-line rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-panel border-b border-line px-4 py-3 flex justify-between items-center">
          <h2 className="font-semibold">{d.id ? "Привычка" : "Новая привычка"}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <div className="label mb-1">Иконка</div>
              <div className="h-12 w-12 rounded-xl bg-panel2 border border-line flex items-center justify-center text-2xl">
                {d.icon}
              </div>
            </div>
            <div className="flex-1">
              <div className="label mb-1">Название *</div>
              <input
                autoFocus
                className="input"
                value={d.title}
                onChange={(e) => setD({ ...d, title: e.target.value })}
                placeholder="например, выпить 2 л воды"
              />
            </div>
          </div>

          <div>
            <div className="label mb-1">Выбери иконку</div>
            <div className="grid grid-cols-10 gap-1.5">
              {HABIT_ICON_PRESETS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setD({ ...d, icon: ic })}
                  className={
                    "h-9 rounded-lg flex items-center justify-center text-lg border " +
                    (d.icon === ic ? "border-accent bg-panel2" : "border-line bg-panel2/40 hover:bg-panel2")
                  }
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-1">Расписание</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(FREQ_LABEL) as HabitFrequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setD({ ...d, frequency: f })}
                  className={
                    "rounded-lg py-2 text-sm border " +
                    (d.frequency === f ? "border-accent text-accent bg-panel2" : "border-line bg-panel2/40 hover:bg-panel2")
                  }
                >
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {d.frequency === "weekly" && (
            <div>
              <div className="label mb-1">Дни недели</div>
              <div className="grid grid-cols-7 gap-1.5">
                {UI_ORDER.map((n, i) => (
                  <button
                    key={n}
                    onClick={() => toggleDow(n)}
                    className={
                      "rounded-lg py-2 text-sm border " +
                      (d.daysOfWeek.includes(n) ? "border-accent text-accent bg-panel2" : "border-line bg-panel2/40")
                    }
                  >
                    {DOW_SHORT_MON[i]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="label mb-1">Заметка</div>
            <textarea
              rows={2}
              className="input"
              value={d.note ?? ""}
              onChange={(e) => setD({ ...d, note: e.target.value })}
              placeholder="зачем эта привычка, как именно делаешь"
            />
          </div>

          {err && <div className="text-sm text-danger">{err}</div>}
        </div>

        <div className="sticky bottom-0 bg-panel border-t border-line p-3 flex gap-2 safe-bottom">
          {onDelete && d.id && (
            <button onClick={onDelete} className="btn text-danger border-danger/40">Удалить</button>
          )}
          <button onClick={onClose} className="btn flex-1">Отмена</button>
          <button onClick={submit} className="btn-primary flex-1">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
