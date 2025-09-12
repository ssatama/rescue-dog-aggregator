import { Card } from "@/components/ui/card";
import { Heart, Zap, Brain, Users, Ruler, Activity } from "lucide-react";

export default function BreedCharacteristics({ breedDescription }) {
  if (!breedDescription?.characteristics) return null;

  const characteristics = breedDescription.characteristics;

  const renderStars = (value) => {
    const stars = Math.min(5, Math.max(0, value));
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={i < stars ? "text-yellow-500" : "text-gray-300"}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const characteristicItems = [
    {
      icon: <Heart className="h-5 w-5 text-red-500" />,
      label: "Affection Level",
      value: characteristics.affection_level,
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      label: "Energy Level",
      value: characteristics.energy_level,
    },
    {
      icon: <Brain className="h-5 w-5 text-purple-500" />,
      label: "Trainability",
      value: characteristics.trainability,
    },
    {
      icon: <Users className="h-5 w-5 text-blue-500" />,
      label: "Good with Kids",
      value: characteristics.good_with_children,
    },
    {
      icon: <Activity className="h-5 w-5 text-green-500" />,
      label: "Exercise Needs",
      value: characteristics.exercise_needs,
    },
    {
      icon: <Ruler className="h-5 w-5 text-indigo-500" />,
      label: "Typical Size",
      value: characteristics.size,
      isText: true,
    },
  ];

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-6">Breed Characteristics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characteristicItems.map(
          (item, index) =>
            item.value && (
              <div key={index} className="flex items-start gap-3">
                {item.icon}
                <div className="flex-1">
                  <p className="font-medium mb-1">{item.label}</p>
                  {item.isText ? (
                    <p className="text-muted-foreground capitalize">
                      {item.value}
                    </p>
                  ) : (
                    renderStars(item.value)
                  )}
                </div>
              </div>
            ),
        )}
      </div>
    </Card>
  );
}
