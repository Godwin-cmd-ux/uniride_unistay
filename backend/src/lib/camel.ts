const normalizeKey = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Converts snake_case database rows into camelCase API payloads. */
export function camelize<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => camelize(item)) as T;
  }
  if (input instanceof Date) {
    return input.toISOString() as unknown as T;
  }
  if (input && typeof input === 'object') {
    const source = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      result[normalizeKey(key)] = camelize(value);
    }
    return result as T;
  }
  return input as T;
}
