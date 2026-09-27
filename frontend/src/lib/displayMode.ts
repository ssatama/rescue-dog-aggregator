/** True when the site runs as an installed app (home screen, Dock). Its own
 * module so instrumentation-client can use it without pulling in React. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
