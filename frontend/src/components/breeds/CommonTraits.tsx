interface CommonTraitsProps {
  personalityTraits: string[];
}

const TRAIT_COLORS: Record<string, { bg: string; text: string }> = {
  gentle: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300" },
  calm: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300" },
  affectionate: { bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-300" },
  sweet: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300" },
  loyal: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
  quiet: { bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-700 dark:text-slate-300" },
  sensitive: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300" },
  graceful: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300" },
  friendly: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300" },
  playful: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
  energetic: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300" },
  intelligent: { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300" },
  independent: { bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-700 dark:text-slate-300" },
  lazy: { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-300" },
};

const DEFAULT_COLORS: Array<{ bg: string; text: string }> = [
  { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
];

function getTraitColor(trait: string): { bg: string; text: string } {
  const lowerTrait = trait.toLowerCase();

  if (TRAIT_COLORS[lowerTrait]) {
    return TRAIT_COLORS[lowerTrait];
  }

  const index = trait.length % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[index];
}

const CommonTraits = ({ personalityTraits }: CommonTraitsProps) => {
  if (!personalityTraits || personalityTraits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Common Traits
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Most frequently observed personality traits
      </p>

      <div className="flex flex-wrap gap-2">
        {personalityTraits.slice(0, 8).map((trait, index) => {
          const colors = getTraitColor(trait);

          return (
            <span
              key={`${trait}-${index}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
            >
              {trait.charAt(0).toUpperCase() + trait.slice(1)}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default CommonTraits;
