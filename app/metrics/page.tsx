"use client";

import { useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import { useWeights, useDailyReports, exportAll, importAll, type Export } from "@/lib/store";
import { KGI, PLAN_META, targetWeight } from "@/lib/plan-data";
import { fmtDate } from "@/lib/date";

export default function MetricsPage() {
  const [weights, setWeights] = useWeights();
  const [reports] = useDailyReports();
  const [newW, setNewW] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addWeight = () => {
    const v = parseFloat(newW.replace(",", "."));
    if (!v) return;
    const date = new Date().toISOString().slice(0, 10);
    setWeights((arr) => {
      const without = arr.filter((w) => w.date !== date);
      return [...without, { date, weight: v }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setNewW("");
  };

  // 30 дней назад -> сегодня по контенту/привычкам
  const last30 = useMemo(() => {
    const out: { date: string; posts: number; reels: number; workout: boolean; english: number; outbound: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const r = reports[key];
      out.push({
        date: key,
        posts: r ? r.postsTg + r.postsX : 0,
        reels: r?.reels ?? 0,
        workout: r?.workout ?? false,
        english: r?.englishMin ?? 0,
        outbound: r?.outbound ?? 0,
      });
    }
    return out;
  }, [reports]);

  const sum30 = {
    posts: last30.reduce((a, r) => a + r.posts, 0),
    reels: last30.reduce((a, r) => a + r.reels, 0),
    workouts: last30.reduce((a, r) => a + (r.workout ? 1 : 0), 0),
    englishHours: (last30.reduce((a, r) => a + r.english, 0) / 60).toFixed(1),
    outbound: last30.reduce((a, r) => a + r.outbound, 0),
  };

  // график: SVG
  const chart = useMemo(() => {
    const W = 320, H = 160, pad = 24;
    const start = new Date(PLAN_META.start);
    const end = new Date(PLAN_META.end);
    const tw = (d: Date) => {
      const dx = (d.getTime() - start.getTime()) / (end.getTime() - start.getTime());
      return pad + dx * (W - pad * 2);
    };
    const ty = (w: number) => {
      const dy = (w - 92) / (110 - 92);
      return pad + (1 - dy) * (H - pad * 2);
    };
    // целевая линия
    const targetPts: string[] = [];
    for (let m = 0; m <= 12; m++) {
      const d = new Date(start); d.setMonth(d.getMonth() + m);
      targetPts.push(`${tw(d).toFixed(1)},${ty(targetWeight(d)).toFixed(1)}`);
    }
    // факт
    const actPts = weights.map((p) => `${tw(new Date(p.date)).toFixed(1)},${ty(p.weight).toFixed(1)}`);
    return { W, H, target: targetPts.join(" "), actual: actPts.join(" "), points: weights.map((p) => ({ x: tw(new Date(p.date)), y: ty(p.weight), w: p.weight, d: p.date })) };
  }, [weights]);

  const last = weights.at(-1);
  const todayTarget = targetWeight(new Date());

  const onExport = () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reboot-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onImport = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result as string) as Export;
        importAll(data);
        location.reload();
      } catch (e) {
        alert("Не удалось распарсить файл");
      }
    };
    fr.readAsText(file);
  };

  return (
    <>
      <Header title="Метрики" sub="Только цифры. Никаких сказок." />

      {/* KGI таблица */}
      <div className="card mb-4">
        <div className="label mb-2">KGI</div>
        <div className="space-y-2 text-sm">
          {KGI.map((k) => (
            <div key={k.key} className="grid grid-cols-4 gap-2 items-baseline border-b border-line last:border-0 pb-2">
              <div className="col-span-2">{k.label}</div>
              <div className="text-muted text-xs">{k.start}</div>
              <div className="text-right">→ {k.target}{k.unit ? "" : ""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Вес */}
      <div className="card mb-4">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="label">Вес</div>
            <div className="text-2xl font-semibold mt-1">
              {last ? last.weight.toFixed(1) : "—"}
              <span className="text-muted text-base"> кг</span>
            </div>
            <div className="text-xs text-muted">target {todayTarget.toFixed(1)} кг · {last ? `${(last.weight - todayTarget >= 0 ? "+" : "")}${(last.weight - todayTarget).toFixed(1)} от плана` : "нет данных"}</div>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="decimal" placeholder="110.0" value={newW}
              onChange={(e) => setNewW(e.target.value)}
              className="input w-24 text-center"
              onKeyDown={(e) => e.key === "Enter" && addWeight()}
            />
            <button onClick={addWeight} className="btn-primary">+ Запись</button>
          </div>
        </div>

        <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-44 mt-2">
          <rect x="0" y="0" width={chart.W} height={chart.H} fill="#16161a" rx="8"/>
          <polyline points={chart.target} fill="none" stroke="#8a8a93" strokeDasharray="4 4" strokeWidth="1.4"/>
          {chart.actual && <polyline points={chart.actual} fill="none" stroke="#6ee7b7" strokeWidth="2"/>}
          {chart.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6ee7b7" />
          ))}
        </svg>
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>{fmtDate(PLAN_META.start)} · 110</span>
          <span>{fmtDate(PLAN_META.end)} · 92</span>
        </div>

        {weights.length > 0 && (
          <details className="mt-3">
            <summary className="text-sm text-muted cursor-pointer">История ({weights.length})</summary>
            <div className="mt-2 space-y-1 max-h-48 overflow-auto pr-1">
              {[...weights].reverse().map((w) => (
                <div key={w.date} className="flex justify-between text-sm border-b border-line py-1">
                  <span>{fmtDate(w.date)}</span>
                  <span>{w.weight.toFixed(1)} кг</span>
                  <button onClick={() => setWeights(weights.filter((x) => x.date !== w.date))} className="text-muted hover:text-danger">✕</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* 30 дней — привычки */}
      <div className="card mb-4">
        <div className="label mb-2">Последние 30 дней</div>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <div className="text-muted">Постов TG+X</div><div className="text-right">{sum30.posts} <span className="text-muted text-xs">/ 12–16 норма/нед</span></div>
          <div className="text-muted">Reels/Shorts</div><div className="text-right">{sum30.reels} <span className="text-muted text-xs">/ 8 норма/мес</span></div>
          <div className="text-muted">Тренировок</div><div className="text-right">{sum30.workouts} <span className="text-muted text-xs">/ 12</span></div>
          <div className="text-muted">Английский, ч</div><div className="text-right">{sum30.englishHours} <span className="text-muted text-xs">/ 12–20</span></div>
          <div className="text-muted">Outbound</div><div className="text-right">{sum30.outbound} <span className="text-muted text-xs">/ 20</span></div>
        </div>
        <div className="grid grid-cols-30 gap-0.5 mt-3" style={{ gridTemplateColumns: "repeat(30, 1fr)" }}>
          {last30.map((d) => {
            const score = (d.posts > 0 ? 1 : 0) + (d.workout ? 1 : 0) + (d.english >= 30 ? 1 : 0) + (d.outbound > 0 ? 1 : 0);
            const op = score === 0 ? 0.12 : score === 1 ? 0.35 : score === 2 ? 0.6 : score === 3 ? 0.8 : 1;
            return <div key={d.date} title={`${d.date}: ${score}/4`} className="aspect-square rounded-sm" style={{ background: `rgba(110, 231, 183, ${op})` }} />;
          })}
        </div>
      </div>

      <div className="card mb-4">
        <div className="label mb-2">Экспорт / импорт</div>
        <div className="flex gap-2">
          <button onClick={onExport} className="btn flex-1">Скачать JSON</button>
          <button onClick={() => fileRef.current?.click()} className="btn flex-1">Загрузить JSON</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </div>
        <p className="text-xs text-muted mt-2">Резервная копия. Подключение Supabase: добавь `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` в Vercel и перезагрузи.</p>
      </div>
    </>
  );
}
