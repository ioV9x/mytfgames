import { Temporal } from "temporal-polyfill";

const noTimeSuffix = "T00:00:00Z";
export function formatGameTimestamp(timestamp: string) {
  const suffixIndex = timestamp.indexOf(noTimeSuffix);
  if (suffixIndex > 0) {
    return Temporal.PlainDate.from(
      timestamp.slice(0, suffixIndex),
    ).toLocaleString();
  }
  return Temporal.Instant.from(timestamp).toLocaleString();
}
