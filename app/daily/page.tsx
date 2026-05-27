"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useDailyReports, useWeights, today, type DailyReport } from "@/lib/store";
import { fmtDate } from "@/lib/date";

const blank = (date: string): DailyReport => ({
  date,
  focus: 60,
  energy: 3,
  mood: 3,
  done: "",
  blockers: "",
  topPriorityTomorrow: "",
  postsTg: 0,
  postsX: 0,
  reels: 0,
  workout: false,
  englishMin: 0,
  outbound: 0,
  weight: null,
});

export default function DailyPage() {
  const [reports, setReports] = useDailyReports();
  const [weights, setWeights] = useWeights();
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<DailyReport>(blank(today()));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(reports[date] ?? blank(date));
  }, [date, reports]);

  const save = () => {
    setReports((p) => ({ ...p, [date]: draft }));
    if (draft.weight) {
      setWeights((arr) => {
        const without = arr.filter((w) => w.date !== date);
        return [...without, { date, weight: draft.weight! }].sort((a, b) => a.date.localeCompare(b.date));
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const last7 = useMemo(() => {
    const arr: DailyReport[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push(reports[key] ?? blank(key));
    }
    return arr;
  }, [reports]);

  const avg7Focus = Math.round(last7.reduce((a, r) => a + (r.focus || 0), 0) / 7);
  const wk = {
    posts: last7.reduce((a, r) => a + r.postsTg + r.postsX, 0),
    reels: last7.reduce((a, r) => a + r.reels, 0),
    workouts: last7.reduce((a, r) => a + (r.workout ? 1 : 0), 0),
    englishHours: (last7.reduce((a, r) => a + r.englishMin, 0) / 60).toFixed(1),
    outbound: last7.reduce((a, r) => a + r.outbound, 0),
  };

  return (
    <>
      <Header title="Отчёт за день" sub="Только факты. Без приукрашиваний." />

      <div className="card mb-4">
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <div className="label">Дата</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input mt-1" />
          </div>
          <div className="text-right">
            <div className="label">Ср. фокус за 7 дней</div>
            <div className="text-xl font-semibold">{avg7Focus}%</div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <label className="label">Фокус: {draft.focus}%</label>
        <input
          type="range" min={0} max={100} step={5}
          value={draft.focus}
          onChange={(e) => setDraft({ ...draft, focus: +e.target.value })}
          className="w-full mt-2 accent-emerald-300"
        />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="label">Энергия</div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setDraft({ ...draft, energy: n })}
                  className={`btn-ghost flex-1 px-0 py-2 ${draft.energy === n ? "border-accent text-accent" : ""}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Настроение</div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setDraft({ ...draft, mood: n })}
                  className={`btn-ghost flex-1 px-0 py-2 ${draft.mood === n ? "border-accent text-accent" : ""}`}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 space-y-3">
        <div>
          <div className="label">Что сделано (только факт)</div>
          <textarea rows={4} value={draft.done} onChange={(e) => setDraft({ ...draft, done: e.target.value })}
            placeholder="• 5 откликов на вакансии&#10;• 1 пост в TG&#10;• 45 мин английского" className="input mt-1" />
        </div>
        <div>
          <div className="label">Что блокирует</div>
          <textarea rows={2} value={draft.blockers} onChange={(e) => setDraft({ ...draft, blockers: e.target.value })}
            placeholder="Скрытый страх / усталость / неясность приоритетов / внешний блокер" className="input mt-1" />
        </div>
        <div>
          <div className="label">Топ-приоритет на завтра</div>
          <input value={draft.topPriorityTomorrow} onChange={(e) => setDraft({ ...draft, topPriorityTomorrow: e.target.value })}
            placeholder="Одно дело, которое сдвинет цель" className="input mt-1" />
        </div>
      </div>

      <div className="card mb-4">
        <div className="label mb-2">Трекинг</div>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Постов TG" val={draft.postsTg} on={(v) => setDraft({ ...draft, postsTg: v })} />
          <NumField label="Постов X" val={draft.postsX} on={(v) => setDraft({ ...draft, postsX: v })} />
          <NumField label="Reels/Shorts" val={draft.reels} on={(v) => setDraft({ ...draft, reels: v })} />
          <NumField label="Outbound" val={draft.outbound} on={(v) => setDraft({ ...draft, outbound: v })} />
          <NumField label="Англ., мин" val={draft.englishMin} on={(v) => setDraft({ ...draft, englishMin: v })} step={15} />
          <NumField label="Вес, кг" val={draft.weight ?? 0} on={(v) => setDraft({ ...draft, weight: v || null })} step={0.1} decimal />
        </div>
        <label className="flex items-center gap-3 mt-3">
          <span onClick={() => setDraft({ ...draft, workout: !draft.workout })} className={"chk " + (draft.workout ? "chk-on" : "")} />
          <span>Тренировка сегодня была</span>
        </label>
      </div>

      <button onClick={save} className="btn-primary w-full mb-4">
        {saved ? "Сохранено ✓" : "Сохранить отчёт"}
      </button>

      <section className="card">
        <div className="label mb-2">Неделя</div>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <div className="text-muted">Постов TG+X</div><div className="text-right">{wk.posts}</div>
          <div className="text-muted">Reels/Shorts</div><div className="text-right">{wk.reels}</div>
          <div className="text-muted">Тренировок</div><div className="text-right">{wk.workouts}/3</div>
          <div className="text-muted">Англ., часов</div><div className="text-right">{wk.englishHours}/3–5</div>
          <div className="text-muted">Outbound</div><div className="text-right">{wk.outbound}/5</div>
        </div>
      </section>

      <section className="mt-4">
        <div className="label mb-2">Последние 7 дней</div>
        <div className="grid grid-cols-7 gap-1">
          {last7.map((r, i) => (
            <div key={i} className={`rounded-md border border-line text-center py-1 ${reports[r.date] ? "bg-panel2" : "opacity-50"}`}>
              <div className="text-[10px] text-muted">{fmtDate(r.date).slice(0, 5)}</div>
              <div className="text-xs">{reports[r.date] ? `${r.focus}%` : "—"}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function NumField({ label, val, on, step = 1, decimal = false }: { label: string; val: number; on: (v: number) => void; step?: number; decimal?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <button onClick={() => on(Math.max(0, +(val - step).toFixed(1)))} className="btn-ghost w-10 py-2 px-0">−</button>
        <input
          inputMode={decimal ? "decimal" : "numeric"}
          value={val || ""}
          onChange={(e) => on(+e.target.value || 0)}
          className="input text-center"
          placeholder="0"
        />
        <button onClick={() => on(+(val + step).toFixed(1))} className="btn-ghost w-10 py-2 px-0">+</button>
      </div>
    </div>
  );
}
