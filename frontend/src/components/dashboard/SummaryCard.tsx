export default function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</p>
      <h2 className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}
