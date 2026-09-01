const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const dir = path.join(process.cwd(), "content", "guides");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

(async () => {
  const { serialize } = await import("next-mdx-remote/serialize");
  const remarkGfm = (await import("remark-gfm")).default;
  const failures = [];

  for (const file of files) {
    const { content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    try {
      await serialize(content, { mdxOptions: { remarkPlugins: [remarkGfm] } });
    } catch (error) {
      failures.push(`${file}: ${error.message.split("\n")[0]}`);
    }
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`compiled ${files.length} guides`);
})();
