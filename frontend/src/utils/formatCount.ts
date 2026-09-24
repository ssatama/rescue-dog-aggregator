export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

/** "1 dog", "2 dogs" (#458: the favorites page said "(1 dogs)"). */
export function dogCountLabel(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "dog" : "dogs"}`;
}
