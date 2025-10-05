interface StatsProps {
  value: string | number;
  label: string;
}

export function Stats({ value, label }: StatsProps) {
  return (
    <div className="inline-flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg mx-2">
      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}
