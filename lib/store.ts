"use client";

// Хранилище приложения. localStorage по умолчанию + опциональная синхронизация с Supabase.
// Все записи именованы по ключу "reboot:<entity>". Версионируется через STORE_VERSION.

import { useEffect, useState, useCallback } from "react";

export const STORE_VERSION = 1;

export type DailyReport = {
  date: string;          // YYYY-MM-DD
  focus: number;         // 0..100 — субъективный фокус
  energy: number;        // 1..5
  mood: number;          // 1..5
  done: string;          // что сделано (Markdown ок)
  blockers: string;      // что мешало
  topPriorityTomorrow: string;
  // быстрые трекеры
  postsTg: number;
  postsX: number;
  reels: number;
  workout: boolean;
  englishMin: number;
  outbound: number;      // отклики/коннекты по работе
  weight?: number | null;
};

export type Reflection = {
  // weekly: дата воскресенья
  date: string;
  worked: string;        // что сработало
  didnt: string;         // что не сработало
  lessons: string;       // выводы
  // воронки по трекам
  career: string;
  blog: string;
  health: string;
  english: string;
  renovation: string;
  blockers: string;
};

export type Insight = {
  id: string;
  createdAt: string; // ISO
  text: string;
  tags: string[];
  important: boolean;
};

export type WeightEntry = { date: string; weight: number; note?: string };

export type TaskState = { done: boolean; doneAt?: string; note?: string };
export type TaskMap = Record<string, TaskState>;

// Пользовательские задачи (поверх плана) и оверрайды дат для задач плана.
export type CustomTask = {
  id: string;            // ct_<uuid>
  stepId: string;        // куда добавлена (S1, S1.1, и т.д.) или "inbox"
  title: string;
  start: string;         // YYYY-MM-DD (required)
  due: string;           // YYYY-MM-DD (required)
  outcome: string;       // required (SMART)
  createdAt: string;
};

// Оверрайды для задач плана: позволяет менять даты/результат у "встроенных" задач.
export type TaskOverride = {
  start?: string;
  due?: string;
  outcome?: string;
  hidden?: boolean;      // не удаляем плановую задачу — скрываем
};
export type TaskOverrides = Record<string, TaskOverride>;

// ----- low-level localStorage -----

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ----- hooks -----

export function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVal(lsGet<T>(key, initial));
    setHydrated(true);
    const onSync = () => setVal(lsGet<T>(key, initial));
    window.addEventListener("reboot:sync-hydrated", onSync);
    return () => window.removeEventListener("reboot:sync-hydrated", onSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (v: T | ((p: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        lsSet(key, next);
        // подсказка для opt-in Supabase синка
        window.dispatchEvent(new CustomEvent("reboot:write", { detail: { key, value: next } }));
        return next;
      });
    },
    [key]
  );

  // Защита от гидрации: пока не загрузились — отдаём initial.
  return [hydrated ? val : initial, update];
}

// ----- domain hooks -----

export const today = () => new Date().toISOString().slice(0, 10);

export function useTasks() {
  return useLocal<TaskMap>("reboot:tasks", {});
}

export function useDailyReports() {
  return useLocal<Record<string, DailyReport>>("reboot:daily", {});
}

export function useReflections() {
  return useLocal<Record<string, Reflection>>("reboot:reflections", {});
}

export function useInsights() {
  return useLocal<Insight[]>("reboot:insights", []);
}

export function useWeights() {
  return useLocal<WeightEntry[]>("reboot:weight", []);
}

export function useCustomTasks() {
  return useLocal<CustomTask[]>("reboot:custom-tasks", []);
}

export function useTaskOverrides() {
  return useLocal<TaskOverrides>("reboot:task-overrides", {});
}

export function useTheme() {
  return useLocal<string>("reboot:theme", "Из найма в продукт через Бали");
}

// ----- export / import -----

export type Export = {
  version: number;
  exportedAt: string;
  tasks: TaskMap;
  daily: Record<string, DailyReport>;
  reflections: Record<string, Reflection>;
  insights: Insight[];
  weight: WeightEntry[];
  theme: string;
  customTasks?: CustomTask[];
  taskOverrides?: TaskOverrides;
};

export function exportAll(): Export {
  return {
    version: STORE_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: lsGet("reboot:tasks", {}),
    daily: lsGet("reboot:daily", {}),
    reflections: lsGet("reboot:reflections", {}),
    insights: lsGet("reboot:insights", []),
    weight: lsGet("reboot:weight", []),
    theme: lsGet("reboot:theme", ""),
    customTasks: lsGet("reboot:custom-tasks", []),
    taskOverrides: lsGet("reboot:task-overrides", {}),
  };
}

export function importAll(data: Export) {
  if (!data || !data.version) throw new Error("invalid file");
  lsSet("reboot:tasks", data.tasks ?? {});
  lsSet("reboot:daily", data.daily ?? {});
  lsSet("reboot:reflections", data.reflections ?? {});
  lsSet("reboot:insights", data.insights ?? []);
  lsSet("reboot:weight", data.weight ?? []);
  if (data.theme) lsSet("reboot:theme", data.theme);
  if (data.customTasks) lsSet("reboot:custom-tasks", data.customTasks);
  if (data.taskOverrides) lsSet("reboot:task-overrides", data.taskOverrides);
}
