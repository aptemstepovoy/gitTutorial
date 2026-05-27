"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Сегодня", icon: "◎" },
  { href: "/plan", label: "План", icon: "▥" },
  { href: "/habits", label: "Привычки", icon: "✓" },
  { href: "/daily", label: "Отчёт", icon: "✎" },
  { href: "/reflection", label: "Рефл.", icon: "◐" },
  { href: "/insights", label: "Инсайты", icon: "✦" },
  { href: "/metrics", label: "Метрики", icon: "△" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-bg/95 backdrop-blur safe-bottom">
      <div className="max-w-3xl mx-auto px-1 py-2 grid grid-cols-7 gap-0.5">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] " +
                (active ? "text-accent" : "text-muted hover:text-ink")
              }
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="mt-0.5">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
