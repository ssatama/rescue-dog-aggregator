export async function serialize(source: string) {
  return {
    compiledSource: `return function() { return <div>${source}</div> }`,
    frontmatter: {},
    scope: {},
  };
}
