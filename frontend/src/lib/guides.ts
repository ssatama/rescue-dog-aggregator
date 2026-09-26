import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Guide, GuideDog, GuideFrontmatter } from "@/types/guide";
import { getAnimals } from "@/services/serverAnimalsService";
import { reportError } from "@/utils/logger";

const guidesDirectory = path.join(process.cwd(), "content/guides");

export async function getGuide(slug: string): Promise<Guide | null> {
  // Resolving against the known slugs keeps a stale inbound link (or a crawler
  // probing a retired guide) out of readFileSync, which threw ENOENT and made
  // the route answer 500 instead of 404.
  if (!getAllGuideSlugs().includes(slug)) {
    return null;
  }

  const fullPath = path.join(guidesDirectory, `${slug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: data as GuideFrontmatter,
    content,
  };
}

export function getAllGuideSlugs(): string[] {
  const fileNames = fs.readdirSync(guidesDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => fileName.replace(/\.mdx$/, ""));
}

export async function getAllGuides(): Promise<Guide[]> {
  const slugs = getAllGuideSlugs();
  const guides = slugs.map((slug) => {
    const fullPath = path.join(guidesDirectory, `${slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      slug,
      frontmatter: data as GuideFrontmatter,
      content,
    };
  });
  return guides;
}

export const GUIDE_DOG_COUNT = 3;

/**
 * Real listed dogs to show with a guide instead of a stock photo (#503), from
 * the guide's own filter. A failure leaves them out rather than failing the page.
 */
export async function getGuideDogs(frontmatter: GuideFrontmatter): Promise<GuideDog[]> {
  try {
    const dogs = await getAnimals({ sort: "recommended", ...frontmatter.dogs?.query, limit: 12 });
    return dogs
      .filter((dog) => dog.primary_image_url && dog.slug)
      .slice(0, GUIDE_DOG_COUNT)
      .map((dog) => ({ id: dog.id, name: dog.name, slug: dog.slug as string, image: dog.primary_image_url as string }));
  } catch (error) {
    reportError(error, { context: "getGuideDogs", slug: frontmatter.slug });
    return [];
  }
}
