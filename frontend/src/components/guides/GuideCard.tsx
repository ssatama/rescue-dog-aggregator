import Link from 'next/link';
import Image from 'next/image';
import { Guide } from '@/types/guide';
import { Badge } from '@/components/ui/badge';

interface GuideCardProps {
  guide: Guide;
  priority?: boolean;
}

export function GuideCard({ guide, priority = false }: GuideCardProps) {
  const { slug, frontmatter } = guide;
  const formattedDate = new Date(frontmatter.lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/guides/${slug}`}
      className="group block overflow-hidden rounded-xl h-[400px] transition-all duration-300
                 hover:shadow-2xl hover:-translate-y-1 focus:outline-2 focus:outline-orange-500"
    >
      {/* Hero Image - Top 60% (55% on lg, 50% on xl for text space) */}
      <div className="relative h-[60%] lg:h-[55%] xl:h-[50%] overflow-hidden">
        <Image
          src={frontmatter.heroImage}
          alt={frontmatter.heroImageAlt || frontmatter.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
        />
      </div>

      {/* Solid Panel - Bottom 40% (45% on lg, 50% on xl - WCAG AAA compliant) */}
      <div className="h-[40%] lg:h-[45%] xl:h-[50%] bg-white dark:bg-guide-dark-elevated p-4 md:p-6 flex flex-col justify-between">
        <div className="flex-1 min-h-0">
          <Badge className="mb-2 bg-orange-500 text-white uppercase text-xs">
            {frontmatter.category}
          </Badge>

          <h3 className="text-lg md:text-xl lg:text-2xl font-bold leading-tight mb-1.5 line-clamp-2
                         text-gray-900 dark:text-white overflow-hidden">
            {frontmatter.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-guide-text-secondary line-clamp-2 overflow-hidden">
            {frontmatter.description}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-guide-text-secondary mt-3 flex-shrink-0">
          <span>📖 {frontmatter.readTime} min</span>
          <span>•</span>
          <span className="hidden sm:inline">Updated {formattedDate}</span>
          <span className="sm:hidden">{formattedDate.split(',')[0]}</span>
        </div>
      </div>
    </Link>
  );
}
