export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function startOfWeekMon(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Mon
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function fmtDate(s?: string): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

export function ruDateLong(d: Date): string {
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}
