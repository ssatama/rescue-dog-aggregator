import { Card } from "@/components/ui/card";
import { Scissors, Heart, Brain, Home } from "lucide-react";

export default function BreedCareInfo({ breedDescription }) {
  if (!breedDescription?.care_info) return null;

  const careInfo = breedDescription.care_info;

  const sections = [
    {
      icon: <Scissors className="h-5 w-5 text-purple-500" />,
      title: "Grooming",
      content: careInfo.grooming,
    },
    {
      icon: <Heart className="h-5 w-5 text-red-500" />,
      title: "Health",
      content: careInfo.health,
    },
    {
      icon: <Brain className="h-5 w-5 text-blue-500" />,
      title: "Training",
      content: careInfo.training,
    },
    {
      icon: <Home className="h-5 w-5 text-green-500" />,
      title: "Living Conditions",
      content: careInfo.living_conditions,
    },
  ];

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-6">Care & Training</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map(
          (section, index) =>
            section.content && (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  {section.icon}
                  <h3 className="font-semibold text-lg">{section.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            ),
        )}
      </div>
    </Card>
  );
}
