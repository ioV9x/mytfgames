export function errorToString(error: unknown): string {
  if (error == null) {
    return "<null/undefined error value>";
  }
  if (
    typeof error === "object" &&
    "statusText" in error &&
    typeof error.statusText === "string"
  ) {
    return error.statusText;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return JSON.stringify(error);
}
