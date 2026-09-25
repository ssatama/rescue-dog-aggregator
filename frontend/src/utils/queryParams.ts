/** A query string as request params, keeping repeated keys (`size[]`) as
 * arrays; `Object.fromEntries` would keep only the last value. */
export function queryToParams(queryString: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(queryString)) {
    const prev = params[key];
    params[key] = prev === undefined ? value : [...(Array.isArray(prev) ? prev : [prev]), value];
  }
  return params;
}
