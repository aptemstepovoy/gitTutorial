"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useInsights, type Insight } from "@/lib/store";

const PRESETS = ["career", "blog", "ops", "ai", "health", "english", "relocation", "product", "anti-bs", "personal"];

function InsightsPageInner() {
  const [insights, setInsights] = useInsights();
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [important, setImportant] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const search = useSearchParams();
  const router = useRouter();

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
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      text: t,
      tags,
      important,
    };
    setInsights([ins, ...insights]);
    setText("");
    setTags([]);
    setImportant(false);
  };

  const del = (id: string) => setInsights(insights.filter((i) => i.id !== id));
  const toggleImp = (id: string) => setInsights(insights.map((i) => (i.id === id ? { ...i, important: !i.important } : i)));

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return insights.filter((i) => {
      if (filter && !i.tags.includes(filter)) return false;
      if (q && !i.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [insights, filter, query]);

  const allTags = useMemo(() => {
    const s = new Set<string>(PRESETS);
    insights.forEach((i) => i.tags.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [insights]);

  return (
    <>
      <Header title="Инсайты" sub="Быстрый capture. Раз в месяц пересматривать на 23-е." />

      <div className="card mb-4">
        <textarea
          ref={taRef}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Мысль / наблюдение / гипотеза…"
          className="input"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
          }}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
              className={`tag ${tags.includes(t) ? "tag-on" : ""}`}
            >
              #{t}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 text-sm">
            <span onClick={() => setImportant((v) => !v)} className={"chk " + (important ? "chk-on" : "")} />
            Важное
          </label>
          <button onClick={add} className="btn-primary">Добавить (⌘↵)</button>
        </div>
      </div>

      <div className="flex gap-2 mb-3 overflow-auto -mx-4 px-4">
        <button onClick={() => setFilter(null)} className={`tag ${!filter ? "tag-on" : ""}`}>все</button>
        {allTags.map((t) => (
          <button key={t} onClick={() => setFilter(filter === t ? null : t)} className={`tag ${filter === t ? "tag-on" : ""}`}>
            #{t}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по тексту…"
        className="input mb-3"
      />

      <div className="space-y-2">
        {visible.length === 0 && <div className="text-sm text-muted">Пусто. Запиши первый инсайт.</div>}
        {visible.map((i) => (
          <div key={i.id} className={"card-sm " + (i.important ? "border-accent/40" : "")}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 whitespace-pre-wrap">{i.text}</div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => toggleImp(i.id)} className="text-muted hover:text-accent">{i.important ? "★" : "☆"}</button>
                <button onClick={() => del(i.id)} className="text-muted hover:text-danger">✕</button>
              </div>
            </div>
            <div className="text-[11px] text-muted mt-1 flex flex-wrap items-center gap-2">
              <span>{new Date(i.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              {i.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <InsightsPageInner />
    </Suspense>
  );
}
