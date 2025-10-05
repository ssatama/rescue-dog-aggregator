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
      {/* Hero Image - Responsive heights for better text space */}
      <div className="relative h-[55%] md:h-[50%] lg:h-[48%] overflow-hidden">
        <Image
          src={frontmatter.heroImage}
          alt={frontmatter.heroImageAlt || frontmatter.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
        />
      </div>

      {/* Content Panel - More space allocated for text clarity */}
      <div className="h-[45%] md:h-[50%] lg:h-[52%] bg-white dark:bg-guide-dark-elevated p-4 md:p-6 flex flex-col justify-between">
        <div className="flex-1 min-h-0">
          <Badge className="mb-3 bg-orange-500 text-white uppercase text-xs font-semibold tracking-wide">
            {frontmatter.category}
          </Badge>

          {/* Larger title with 3-line clamp for better readability */}
          <h3 className="text-xl md:text-2xl lg:text-2xl font-bold leading-tight line-clamp-3
                         text-gray-900 dark:text-white overflow-hidden">
            {frontmatter.title}
          </h3>
        </div>

        {/* Meta section pinned to bottom with better spacing */}
        <div className="flex items-center gap-3 text-xs md:text-sm text-gray-500 dark:text-guide-text-secondary 
                        mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <span className="flex items-center gap-1">
            <span className="text-base" aria-hidden="true">📖</span>
            <span>{frontmatter.readTime} min</span>
          </span>
          <span aria-hidden="true">•</span>
          <time dateTime={frontmatter.lastUpdated} className="hidden sm:inline">
            Updated {formattedDate}
          </time>
          <time dateTime={frontmatter.lastUpdated} className="sm:hidden">
            {formattedDate.split(',')[0]}
          </time>
        </div>
      </div>
    </Link>
  );
}