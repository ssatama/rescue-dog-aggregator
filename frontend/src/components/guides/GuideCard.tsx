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
      {/* Hero Image - Top 60% */}
      <div className="relative h-[60%] overflow-hidden">
        <Image
          src={frontmatter.heroImage}
          alt={frontmatter.heroImageAlt || frontmatter.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
        />
      </div>

      {/* Solid Panel - Bottom 40% (WCAG AAA compliant) */}
      <div className="h-[40%] bg-white dark:bg-guide-dark-elevated p-6 flex flex-col justify-between">
        <div>
          <Badge className="mb-3 bg-orange-500 text-white uppercase text-xs">
            {frontmatter.category}
          </Badge>

          <h3 className="text-xl md:text-2xl font-bold mb-2 line-clamp-2
                         text-gray-900 dark:text-white">
            {frontmatter.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-guide-text-secondary line-clamp-2">
            {frontmatter.description}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-guide-text-secondary">
          <span>📖 {frontmatter.readTime} min read</span>
          <span>•</span>
          <span>Updated {formattedDate}</span>
        </div>
      </div>
    </Link>
  );
}
