interface StatsProps {
  value: string | number;
  label: string;
}

export function Stats({ value, label }: StatsProps) {
  return (
    <div className="mx-2 inline-flex flex-col items-center rounded-xl border border-line bg-surface p-4">
      <div className="font-display text-3xl font-bold text-ink">
        {value}
      </div>
      <div className="text-sm text-subtle">{label}</div>
    </div>
  );
}
