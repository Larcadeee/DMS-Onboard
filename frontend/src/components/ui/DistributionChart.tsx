"use client";

interface DistributionChartProps {
  data: Array<{ label: string; value: number }>;
  type?: "bar" | "donut";
  color?: "green" | "amber";
}

const greenColors = ["#15803d", "#22c55e", "#86efac", "#404040", "#a3a3a3", "#d4d4d4"];

export function DistributionChart({
  data,
  type = "bar",
  color = "green",
}: DistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data available.</p>;
  }

  if (type === "bar") {
    const max = Math.max(...data.map((item) => item.value), 1);
    return (
      <div className="space-y-3" role="img" aria-label="Bar chart">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-ink-soft">{item.label}</span>
              <span className="font-semibold tabular-nums text-ink">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={color === "amber" ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-brand"}
                style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const radius = 15.9155;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Donut chart">
          <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="5" />
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const preceding = data
              .slice(0, index)
              .reduce((sum, previous) => sum + (previous.value / total) * 100, 0);
            const dashOffset = 25 - preceding;
            return (
              <circle
                key={item.label}
                cx="21"
                cy="21"
                r={radius}
                fill="transparent"
                stroke={greenColors[index % greenColors.length]}
                strokeWidth="5"
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-ink">{total}</span>
          <span className="text-[11px] text-muted">Total</span>
        </div>
      </div>
      <div className="grid w-full gap-2 sm:max-w-[180px]" aria-label="Chart legend">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-ink-soft">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: greenColors[index % greenColors.length] }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
