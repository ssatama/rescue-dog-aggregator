import type { BreedData } from "@/types/breeds";

interface PersonalityBarChartProps {
  breedData: BreedData;
}

const METRIC_CONFIG: Record<string, { label: string; barColor: string; textColor: string }> = {
  energy_level: {
    label: "Energy",
    barColor: "bg-orange-500",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  affection: {
    label: "Affection",
    barColor: "bg-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
  },
  trainability: {
    label: "Trainability",
    barColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  independence: {
    label: "Independence",
    barColor: "bg-slate-500",
    textColor: "text-slate-600 dark:text-slate-400",
  },
};

const PersonalityBarChart = ({ breedData }: PersonalityBarChartProps) => {
  if (!breedData.personality_metrics) {
    return null;
  }

  const personalityMetrics = breedData.personality_metrics;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Personality Profile
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Based on {breedData.count || 0} {breedData.primary_breed} rescues
          available
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(personalityMetrics).map(([key, data]) => {
          const config = METRIC_CONFIG[key];
          if (!config) return null;

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {config.label}
                </span>
                <span className={`text-sm font-semibold ${config.textColor}`}>
                  {data.label}
                </span>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-3">
                <div
                  className={`${config.barColor} h-3 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalityBarChart;
