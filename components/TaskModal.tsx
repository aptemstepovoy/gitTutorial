"use client";

import { useEffect, useState } from "react";
import { STEPS } from "@/lib/plan-data";
import type { CustomTask } from "@/lib/store";

export type TaskDraft = {
  id?: string;            // если редактирование плановой — id плановой; если кастом — ct_*
  source: "plan" | "custom" | "new";
  stepId: string;
  title: string;
  start: string;
  due: string;
  outcome: string;
};

const ymd = (d = new Date()) => d.toISOString().slice(0, 10);
const plus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
};

export function emptyTaskDraft(stepId = ""): TaskDraft {
  return {
    source: "new",
    stepId,
    title: "",
    start: ymd(),
    due: plus(7),
    outcome: "",
  };
}

export default function TaskModal({
  open,
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  draft: TaskDraft | null;
  onClose: () => void;
  onSave: (d: TaskDraft) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<TaskDraft | null>(draft);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    setD(draft);
    setErr("");
  }, [draft]);

  if (!open || !d) return null;

  const isPlan = d.source === "plan";

  const submit = () => {
    if (!d.title.trim()) return setErr("Заполни название задачи");
    if (!d.stepId) return setErr("Выбери шаг (трек)");
    if (!d.start) return setErr("Укажи дату старта");
    if (!d.due) return setErr("Укажи дедлайн");
    if (!d.outcome.trim()) return setErr("Опиши конечный результат (SMART)");
    if (d.start > d.due) return setErr("Старт не может быть позже дедлайна");
    onSave(d);
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
          <h2 className="font-semibold">
            {d.source === "new" ? "Новая задача" : "Задача"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="label">Название *</div>
            <input
              autoFocus
              className="input mt-1"
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
              placeholder="Чёткое короткое название"
              disabled={isPlan}
            />
            {isPlan && <p className="text-xs text-muted mt-1">Название плановой задачи менять нельзя — только даты и результат.</p>}
          </div>

          <div>
            <div className="label">Шаг / трек *</div>
            <select
              className="input mt-1"
              value={d.stepId}
              onChange={(e) => setD({ ...d, stepId: e.target.value })}
              disabled={isPlan}
            >
              <option value="">— выбери —</option>
              {STEPS.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
              <option value="inbox">Inbox (без шага)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Старт *</div>
              <input
                type="date"
                className="input mt-1"
                value={d.start}
                onChange={(e) => setD({ ...d, start: e.target.value })}
              />
            </div>
            <div>
              <div className="label">Дедлайн *</div>
              <input
                type="date"
                className="input mt-1"
                value={d.due}
                onChange={(e) => setD({ ...d, due: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="label">Результат (SMART) *</div>
            <textarea
              rows={3}
              className="input mt-1"
              value={d.outcome}
              onChange={(e) => setD({ ...d, outcome: e.target.value })}
              placeholder="Что конкретно появится по итогу? Артефакт, цифра, ссылка."
            />
          </div>

          {err && <div className="text-sm text-danger">{err}</div>}
        </div>

        <div className="sticky bottom-0 bg-panel border-t border-line p-3 flex gap-2 safe-bottom">
          {onDelete && d.source !== "new" && (
            <button onClick={onDelete} className="btn text-danger border-danger/40">
              {d.source === "plan" ? "Скрыть" : "Удалить"}
            </button>
          )}
          <button onClick={onClose} className="btn flex-1">Отмена</button>
          <button onClick={submit} className="btn-primary flex-1">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
