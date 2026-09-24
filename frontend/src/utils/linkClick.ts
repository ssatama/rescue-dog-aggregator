import type React from "react";

/**
 * True for an unmodified primary-button click. Cards that are real links but open a
 * modal on tap use this to leave middle-click and ctrl/cmd/shift-click to the browser.
 */
export function isPlainLeftClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
