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
      <div className="max-w-3xl mx-auto px-1 py-1.5 flex">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "flex-1 min-w-0 flex flex-col items-center justify-center rounded-lg py-1.5 px-0.5 " +
                (active ? "text-accent" : "text-muted hover:text-ink")
              }
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="mt-0.5 text-[10px] truncate w-full text-center">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
