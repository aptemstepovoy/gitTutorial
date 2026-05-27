"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useInsights, type Insight } from "@/lib/store";
import { useVoice } from "@/lib/voice";

const WEEK_MS = 7 * 86400 * 1000;
const MONTH_MS = 30 * 86400 * 1000;

const DOW = ["ВОСКРЕСЕНЬЕ", "ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}
function dayHeader(iso: string) {
  const d = new Date(iso);
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`.toUpperCase();
}
function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function InsightsPageInner() {
  const [insights, setInsights] = useInsights();
  const [text, setText] = useState("");
  const [voiceSession, setVoiceSession] = useState(false);
  const [query, setQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const search = useSearchParams();
  const router = useRouter();

  const voice = useVoice((delta) => setText(delta));

  useEffect(() => {
    if (search.get("new") === "1") {
      taRef.current?.focus();
      taRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      router.replace(url.pathname + url.search);
    }
  }, [search, router]);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const ins: Insight = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      text: t,
      tags: [],
      important: false,
      voice: voiceSession,
    };
    setInsights([ins, ...insights]);
    setText("");
    setVoiceSession(false);
  };

  const del = (id: string) => {
    if (!confirm("Удалить инсайт?")) return;
    setInsights(insights.filter((i) => i.id !== id));
  };
  const toggleImp = (id: string) =>
    setInsights(insights.map((i) => (i.id === id ? { ...i, important: !i.important } : i)));

  const now = Date.now();
  const stats = useMemo(() => {
    let week = 0, month = 0, voiceCount = 0;
    for (const i of insights) {
      const t = new Date(i.createdAt).getTime();
      if (now - t <= WEEK_MS) week++;
      if (now - t <= MONTH_MS) month++;
      if (i.voice) voiceCount++;
    }
    return { total: insights.length, week, month, voice: voiceCount };
  }, [insights, now]);

  // группировка по дням
  const grouped = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q ? insights.filter((i) => i.text.toLowerCase().includes(q)) : insights;
    const map = new Map<string, Insight[]>();
    for (const i of filtered) {
      const k = dayKey(i.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [insights, query]);

  const onMic = () => {
    if (!voice.supported) {
      alert("Голосовой ввод не поддерживается этим браузером. Открой в Safari/Chrome.");
      return;
    }
    if (!voice.listening) setVoiceSession(true);
    voice.toggle();
  };

  return (
    <>
      <Header title="Инсайты" sub="Что нового понял, идеи, наблюдения — в одну ленту." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Всего" value={stats.total} />
        <Stat label="За неделю" value={stats.week} />
        <Stat label="За месяц" value={stats.month} />
        <Stat label="Голосом" value={stats.voice} />
      </div>

      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-warn">💡</span>
          <span className="label">Записать сейчас</span>
        </div>
        <div className="relative">
          <textarea
            ref={taRef}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="мысль, идея, наблюдение…"
            className="input pr-12"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
            }}
          />
          <button
            onClick={onMic}
            title={voice.supported ? (voice.listening ? "Остановить запись" : "Записать голосом") : "Голос не поддерживается"}
            className={
              "absolute right-2 top-2 h-9 w-9 rounded-full flex items-center justify-center border " +
              (voice.listening ? "bg-danger/20 border-danger text-danger animate-pulse" : "bg-panel2 border-line text-muted hover:text-ink")
            }
          >
            🎙
          </button>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={add} className="btn-primary px-6" disabled={!text.trim()}>Сохранить</button>
        </div>
      </div>

      <div className="relative mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по инсайтам"
          className="input pl-10"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
      </div>

      <div className="space-y-6">
        {grouped.length === 0 && (
          <div className="text-sm text-muted">{query ? "Ничего не найдено." : "Пусто. Запиши первый инсайт."}</div>
        )}
        {grouped.map(([day, items]) => (
          <section key={day}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="label">{dayHeader(items[0].createdAt)}</h3>
              <span className="text-xs text-muted">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className={"card-sm group " + (i.important ? "border-accent/40" : "")}>
                  <div className="flex items-start gap-3">
                    <span className="text-warn mt-0.5 flex-shrink-0">💡</span>
                    <div className="flex-1 min-w-0">
                      <div className="whitespace-pre-wrap">{i.text}</div>
                      <div className="text-[11px] text-muted mt-1 flex items-center gap-2">
                        <span>{hhmm(i.createdAt)}</span>
                        {i.voice && <span className="tag">голос</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 text-base opacity-50 group-hover:opacity-100 transition">
                      <button onClick={() => toggleImp(i.id)} className="text-muted hover:text-warn" title="Важное">
                        {i.important ? "★" : "☆"}
                      </button>
                      <button onClick={() => del(i.id)} className="text-muted hover:text-danger" title="Удалить">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <InsightsPageInner />
    </Suspense>
  );
}
