import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Guide, GuideFrontmatter } from "@/types/guide";

const guidesDirectory = path.join(process.cwd(), "content/guides");

export async function getGuide(slug: string): Promise<Guide> {
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
