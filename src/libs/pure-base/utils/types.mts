/**
 * Dictionary type which is a partial map of keys to values.
 * Basically an alias for the `Partial<Record<P, T>>` type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/consistent-indexed-object-style
export type Dictionary<P extends keyof any, T> = {
  [K in P]?: T;
};
