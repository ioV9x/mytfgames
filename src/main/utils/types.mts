export type DeepRequired<T> = {
  [P in keyof T]-?: Exclude<T[P], undefined> extends object
    ? DeepRequired<T[P]>
    : T[P];
};

export function isErrnoException(
  error: unknown,
): error is NodeJS.ErrnoException & { code: string; errno: number } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    "errno" in error &&
    typeof error.errno === "number"
  );
}

