/**
 * Search engines truncate titles past ~65 characters and descriptions past ~160, and
 * Bing Webmaster Tools flags both (#444). Every generated title and description goes
 * through these, so long names, taglines or rescue blurbs can't push a page over.
 */
export const MAX_TITLE_LENGTH = 65;
export const MAX_DESCRIPTION_LENGTH = 160;

function clamp(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** One line, at most 160 characters, cut at a word boundary. */
export function clampDescription(text: string): string {
  return clamp(text, MAX_DESCRIPTION_LENGTH);
}

/** At most 65 characters, cut at a word boundary. */
export function clampTitle(text: string): string {
  return clamp(text, MAX_TITLE_LENGTH);
}
