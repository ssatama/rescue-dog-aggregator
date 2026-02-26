import type { ExperienceDistribution } from "@/types/breeds";

interface ExperienceLevelChartProps {
  experienceDistribution: ExperienceDistribution | null;
}

const ExperienceLevelChart = ({ experienceDistribution }: ExperienceLevelChartProps) => {
  if (!experienceDistribution) {
    return null;
  }

  const total =
    (experienceDistribution.first_time_ok || 0) +
    (experienceDistribution.some_experience || 0) +
    (experienceDistribution.experienced || 0);

  if (total === 0) {
    return null;
  }

  const calculatePercentage = (value: number): number => Math.round((value / total) * 100);

  const levels = [
    {
      label: "First-time OK",
      count: experienceDistribution.first_time_ok || 0,
      percentage: calculatePercentage(experienceDistribution.first_time_ok || 0),
      color: "bg-emerald-500",
    },
    {
      label: "Some experience",
      count: experienceDistribution.some_experience || 0,
      percentage: calculatePercentage(experienceDistribution.some_experience || 0),
      color: "bg-sky-500",
    },
    {
      label: "Experienced",
      count: experienceDistribution.experienced || 0,
      percentage: calculatePercentage(experienceDistribution.experienced || 0),
      color: "bg-violet-500",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Experience Level
      </h2>

      <div className="space-y-3">
        {levels.map((level, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {level.label}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {level.percentage}%
              </span>
            </div>

            <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2.5">
              <div
                className={`${level.color} h-2.5 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none`}
                style={{ width: `${level.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceLevelChart;
