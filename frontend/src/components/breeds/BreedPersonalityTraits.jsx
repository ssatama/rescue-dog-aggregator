import { Badge } from "@/components/ui/badge";

export default function BreedPersonalityTraits({ traits = [] }) {
  if (!traits || traits.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4">Personality Traits</h3>
      <div className="flex flex-wrap gap-2">
        {traits.map((trait, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="px-4 py-2 text-sm font-medium bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {trait}
          </Badge>
        ))}
      </div>
    </div>
  );
}
