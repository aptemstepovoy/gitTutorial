"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import {
  useDailyReports,
  useWeights,
  useInsights,
  today,
  type DailyReport,
  type Insight,
} from "@/lib/store";
import { fmtDate } from "@/lib/date";

const blank = (date: string): DailyReport => ({
  date,
  done: "",
  focusTomorrow: "",
  state: "",
  insightsText: "",
  reflection: "",
  focus: 60,
  energy: 3,
  mood: 3,
  blockers: "",
  postsTg: 0,
  postsX: 0,
  reels: 0,
  workout: false,
  englishMin: 0,
  outbound: 0,
  weight: null,
});

const MONTHS_FULL = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_FULL[m - 1]} ${y}`;
}

export default function DailyPage() {
  const [reports, setReports] = useDailyReports();
  const [, setWeights] = useWeights();
  const [insights, setInsights] = useInsights();

  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState<DailyReport>(blank(today()));
  const [saved, setSaved] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);

  useEffect(() => {
    setDraft(reports[date] ?? blank(date));
  }, [date, reports]);

  const save = () => {
    setReports((p) => ({ ...p, [date]: draft }));

    // вес — если указан, кладём в трекер веса
    if (draft.weight) {
      setWeights((arr) => {
        const without = arr.filter((w) => w.date !== date);
        return [...without, { date, weight: draft.weight! }].sort((a, b) => a.date.localeCompare(b.date));
      });
    }

    // инсайты — каждая непустая строка превращается в запись в /insights,
    // если ещё не была добавлена из этого отчёта
    const lines = draft.insightsText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length) {
      const existing = new Set(insights.map((i) => i.text.trim()));
      const ts = new Date(`${date}T20:00:00`).toISOString();
      const newOnes: Insight[] = lines
        .filter((t) => !existing.has(t))
        .map((t) => ({
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          createdAt: ts,
          text: t,
          tags: ["from-journal"],
          important: false,
        }));
      if (newOnes.length) setInsights([...newOnes, ...insights]);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const history = useMemo(() => {
    return Object.values(reports)
      .filter((r) => r.done || r.focusTomorrow || r.state || r.reflection || r.insightsText)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [reports]);

  return (
    <>
      <Header
        title="Отчёт за день"
        sub={
          <>
            Что сделано, <span className="kicker-amber">фокус завтра</span>, <span className="kicker-amber">состояние</span>,{" "}
            <span className="kicker-amber">инсайты</span>, <span className="kicker-amber">рефлексия</span>
          </>
        }
      />

      <section className="card mb-5">
        <h2 className="font-semibold mb-3">Новый отчёт</h2>

        <div className="space-y-4">
          <Field label="Дата">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>

          <Field label="Что сделано сегодня">
            <textarea
              rows={4}
              value={draft.done}
              onChange={(e) => setDraft({ ...draft, done: e.target.value })}
              placeholder="конкретные результаты, не процесс"
              className="input"
            />
          </Field>

          <Field label="Фокусные задачи на завтра">
            <textarea
              rows={3}
              value={draft.focusTomorrow}
              onChange={(e) => setDraft({ ...draft, focusTomorrow: e.target.value })}
              placeholder="1-3 главных задачи"
              className="input"
            />
          </Field>

          <Field label="Состояние">
            <textarea
              rows={3}
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              placeholder="опиши состояние своими словами"
              className="input"
            />
          </Field>

          <Field label="Инсайты">
            <textarea
              rows={3}
              value={draft.insightsText}
              onChange={(e) => setDraft({ ...draft, insightsText: e.target.value })}
              placeholder="что нового понял, идеи, наблюдения"
              className="input"
            />
            <p className="text-[11px] text-muted mt-1">Каждая строка автоматически попадёт во вкладку «Инсайты».</p>
          </Field>

          <Field label="Рефлексия дня">
            <textarea
              rows={4}
              value={draft.reflection}
              onChange={(e) => setDraft({ ...draft, reflection: e.target.value })}
              placeholder="как прошёл день, эмоции, что бы изменил"
              className="input"
            />
          </Field>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={save} className="btn-primary px-6">
            {saved ? "Сохранено ✓" : "Сохранить отчёт"}
          </button>
        </div>
      </section>

      {/* Свёрнутый трекинг — для /metrics */}
      <details className="card mb-5" open={trackOpen} onToggle={(e) => setTrackOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer flex items-center justify-between">
          <span className="font-semibold">Трекинг привычек</span>
          <span className="text-xs text-muted">фокус, энергия, вес, посты, тренировка, английский, outbound</span>
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Фокус: {draft.focus}%</label>
            <input
              type="range" min={0} max={100} step={5}
              value={draft.focus}
              onChange={(e) => setDraft({ ...draft, focus: +e.target.value })}
              className="w-full mt-2 accent-fuchsia-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PickRow label="Энергия" val={draft.energy} on={(n) => setDraft({ ...draft, energy: n })} />
            <PickRow label="Настроение" val={draft.mood} on={(n) => setDraft({ ...draft, mood: n })} />
          </div>
          <Field label="Что блокирует">
            <textarea
              rows={2}
              value={draft.blockers}
              onChange={(e) => setDraft({ ...draft, blockers: e.target.value })}
              placeholder="страх / усталость / внешний блокер"
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Постов TG" val={draft.postsTg} on={(v) => setDraft({ ...draft, postsTg: v })} />
            <NumField label="Постов X" val={draft.postsX} on={(v) => setDraft({ ...draft, postsX: v })} />
            <NumField label="Reels/Shorts" val={draft.reels} on={(v) => setDraft({ ...draft, reels: v })} />
            <NumField label="Outbound" val={draft.outbound} on={(v) => setDraft({ ...draft, outbound: v })} />
            <NumField label="Англ., мин" val={draft.englishMin} on={(v) => setDraft({ ...draft, englishMin: v })} step={15} />
            <NumField label="Вес, кг" val={draft.weight ?? 0} on={(v) => setDraft({ ...draft, weight: v || null })} step={0.1} decimal />
          </div>
          <label className="flex items-center gap-3">
            <span onClick={() => setDraft({ ...draft, workout: !draft.workout })} className={"chk " + (draft.workout ? "chk-on" : "")} />
            <span>Тренировка сегодня была</span>
          </label>
        </div>
      </details>

      <section>
        <h2 className="text-xl font-semibold mb-3">История</h2>
        {history.length === 0 && (
          <div className="text-sm text-muted card">Пока пусто. Первый отчёт — сейчас.</div>
        )}
        <div className="space-y-2">
          {history.map((r) => {
            const open = openHistoryId === r.date;
            const teaser = (r.done || r.reflection || r.state || "").replace(/\s+/g, " ").slice(0, 70);
            return (
              <div key={r.date} className="card">
                <button
                  onClick={() => setOpenHistoryId(open ? null : r.date)}
                  className="w-full flex items-center justify-between text-left gap-3"
                >
                  <div className="font-medium">{longDate(r.date)}</div>
                  <div className="text-sm text-muted flex-1 truncate text-right pr-2">{teaser}{teaser.length === 70 ? "…" : ""}</div>
                  <span className="text-muted">{open ? "▾" : "▸"}</span>
                </button>
                {open && (
                  <div className="mt-3 space-y-3 text-sm">
                    {r.done && <HistorySection title="Что сделано" body={r.done} />}
                    {r.focusTomorrow && <HistorySection title="Фокус завтра" body={r.focusTomorrow} />}
                    {r.state && <HistorySection title="Состояние" body={r.state} />}
                    {r.insightsText && <HistorySection title="Инсайты" body={r.insightsText} />}
                    {r.reflection && <HistorySection title="Рефлексия" body={r.reflection} />}
                    <div className="flex justify-end pt-1">
                      <button onClick={() => setDate(r.date)} className="btn-ghost text-xs">Открыть для редактирования</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function HistorySection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="label kicker-amber mb-1">{title}</div>
      <div className="whitespace-pre-wrap text-ink/90">{body}</div>
    </div>
  );
}

function PickRow({ label, val, on }: { label: string; val: number; on: (n: number) => void }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => on(n)}
            className={`btn-ghost flex-1 px-0 py-2 ${val === n ? "border-accent text-accent" : ""}`}>{n}</button>
        ))}
      </div>
    </div>
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
