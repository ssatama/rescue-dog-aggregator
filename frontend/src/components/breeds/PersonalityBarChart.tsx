import type { BreedData, PersonalityMetric } from "@/types/breeds";

interface PersonalityBarChartProps {
  breedData: BreedData;
}

const PersonalityBarChart = ({ breedData }: PersonalityBarChartProps) => {
  const personalityMetrics = breedData.personality_metrics || {
    energy_level: { percentage: 50, label: "No data" },
    affection: { percentage: 50, label: "No data" },
    trainability: { percentage: 50, label: "No data" },
    independence: { percentage: 50, label: "No data" },
  };

  const metricLabels: Record<string, string> = {
    energy_level: "Energy Level",
    affection: "Affection",
    trainability: "Trainability",
    independence: "Independence",
  };

  if (!breedData.personality_metrics) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold mb-2">Personality Profile</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Based on {breedData.count || 0} {breedData.primary_breed} rescues
        currently available
      </p>

      <div className="space-y-4">
        {Object.entries(personalityMetrics).map(([key, data]) => (
          <div key={key} className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
              {metricLabels[key]}
            </div>

            <div className="flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${data.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="w-20 text-sm font-medium text-purple-600 text-right">
              {data.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalityBarChart;
