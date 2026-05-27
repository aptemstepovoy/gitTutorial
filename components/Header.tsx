export default function Header({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
    </header>
  );
}
