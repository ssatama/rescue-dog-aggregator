// frontend/src/components/home/previews/PersonalityBarsPreview.tsx

const traits = [
  { name: 'Affectionate', value: 78, gradient: 'from-purple-400 to-purple-600' },
  { name: 'Energetic', value: 65, gradient: 'from-orange-400 to-orange-600' },
  { name: 'Intelligent', value: 82, gradient: 'from-blue-400 to-blue-600' },
  { name: 'Trainability', value: 75, gradient: 'from-green-400 to-green-600' },
];

export default function PersonalityBarsPreview() {
  return (
    <div className="w-full space-y-4 px-4">
      {traits.map((trait) => (
        <div key={trait.name}>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {trait.name}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {trait.value}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${trait.gradient}`}
              style={{ width: `${trait.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
