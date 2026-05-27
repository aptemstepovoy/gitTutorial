"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useReflections, type Reflection } from "@/lib/store";
import { startOfWeekMon, fmtDate } from "@/lib/date";

const blank = (date: string): Reflection => ({
  date,
  worked: "",
  didnt: "",
  lessons: "",
  career: "",
  blog: "",
  health: "",
  english: "",
  renovation: "",
  blockers: "",
});

const PROMPTS = [
  { key: "worked", label: "Что сработало (факты + почему)" },
  { key: "didnt", label: "Что НЕ сработало (без оправданий)" },
  { key: "lessons", label: "Главный вывод недели — одно предложение" },
  { key: "career", label: "Career: воронка, отклики, интервью" },
  { key: "blog", label: "Блог: что опубликовано, реакции, инсайты" },
  { key: "health", label: "Health: вес, тренировки, сон" },
  { key: "english", label: "English: часов, прогресс" },
  { key: "renovation", label: "Ремонт / авто: прогресс" },
  { key: "blockers", label: "Системные блокеры и план на следующую неделю" },
] as const;

function nextSunday(d: Date) {
  // воскресенье: если сегодня вс — оно само, иначе ближайшее впереди
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0 = вс
  if (dow === 0) return x;
  x.setDate(x.getDate() + (7 - dow));
  return x;
}

function lastSundayOrToday(): string {
  const now = new Date();
  if (now.getDay() === 0) return now.toISOString().slice(0, 10);
  // последняя прошедшая воскресная
  const x = new Date(now);
  x.setDate(x.getDate() - x.getDay());
  return x.toISOString().slice(0, 10);
}

export default function ReflectionPage() {
  const [refl, setRefl] = useReflections();
  const [date, setDate] = useState<string>(lastSundayOrToday());
  const [draft, setDraft] = useState<Reflection>(blank(lastSundayOrToday()));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(refl[date] ?? blank(date));
  }, [date, refl]);

  const save = () => {
    setRefl((p) => ({ ...p, [date]: draft }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const past = useMemo(() => Object.values(refl).sort((a, b) => b.date.localeCompare(a.date)), [refl]);

  const weekStart = startOfWeekMon(new Date(date));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <>
      <Header
        title="Рефлексия"
        sub="Воскресенье 19:00 · 30 мин. Только правда."
      />

      <div className="card mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="label">Неделя</div>
            <div className="text-sm mt-1">
              {fmtDate(weekStart.toISOString().slice(0, 10))} – {fmtDate(weekEnd.toISOString().slice(0, 10))}
            </div>
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input max-w-[180px]" />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {PROMPTS.map((p) => (
          <div key={p.key} className="card">
            <div className="label">{p.label}</div>
            <textarea
              rows={3}
              value={(draft as any)[p.key]}
              onChange={(e) => setDraft({ ...draft, [p.key]: e.target.value })}
              className="input mt-1"
            />
          </div>
        ))}
      </div>

      <button onClick={save} className="btn-primary w-full mb-6">
        {saved ? "Сохранено ✓" : "Сохранить рефлексию"}
      </button>

      <h2 className="label mb-2">История</h2>
      <div className="space-y-2">
        {past.length === 0 && <div className="text-sm text-muted">Пока пусто. Первая рефлексия — это самая важная.</div>}
        {past.map((r) => (
          <button
            key={r.date}
            onClick={() => setDate(r.date)}
            className="card-sm w-full text-left flex justify-between items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{fmtDate(r.date)}</div>
              <div className="text-xs text-muted line-clamp-2">{r.lessons || r.worked || "—"}</div>
            </div>
            <span className="text-xs text-muted">→</span>
          </button>
        ))}
      </div>
    </>
  );
}
