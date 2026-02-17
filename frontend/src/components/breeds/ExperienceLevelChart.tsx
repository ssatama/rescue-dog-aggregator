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
      percentage: calculatePercentage(
        experienceDistribution.first_time_ok || 0,
      ),
      color: "bg-green-500",
    },
    {
      label: "Some experience",
      count: experienceDistribution.some_experience || 0,
      percentage: calculatePercentage(
        experienceDistribution.some_experience || 0,
      ),
      color: "bg-blue-500",
    },
    {
      label: "Experienced",
      count: experienceDistribution.experienced || 0,
      percentage: calculatePercentage(experienceDistribution.experienced || 0),
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Experience Level</h2>

      <div className="space-y-4">
        {levels.map((level, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {level.label}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {level.percentage}%
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`${level.color} h-2 rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${level.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceLevelChart;
