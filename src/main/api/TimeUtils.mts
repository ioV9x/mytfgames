import { Temporal } from "temporal-polyfill";

// Timezone is for USA, Maryland, Baltimore
const apiTimeZone = "US/Eastern";
function fixupTimeZone(date: {
  toZonedDateTime: (tz: string) => Temporal.ZonedDateTime;
}) {
  return date.toZonedDateTime(apiTimeZone).withTimeZone("UTC").toInstant();
}
const timestampFormatVariants = [
  // 2021-01-10
  // this is the format usually used on the game search page
  [
    /^2\d\d\d-\d\d-\d\d$/,
    (match: RegExpMatchArray) => Temporal.Instant.from(`${match[0]}T00:00:00Z`),
  ],
  // 01/10/2021
  // this is the format used by the website if the user is not logged in
  [
    /^(\d?\d)\/(\d?\d)\/(2\d\d\d)$/,
    (match: RegExpMatchArray) =>
      Temporal.Instant.from(
        `${match[3]!}-${match[1]!.padStart(2, "0")}-${match[2]!.padStart(2, "0")}T00:00:00Z`,
      ),
  ],
  // |10 Jan 2021|, 00:00
  // this is the format used by the website if the user is logged in
  [
    /^\|(\d\d \w+ 2\d\d\d)\|, (\d\d:\d\d)$/,
    (match: RegExpMatchArray) =>
      fixupTimeZone(
        Temporal.PlainDateTime.from(
          `${new Date(match[1]! + "Z").toISOString().substring(0, 10)}T${match[2]!}:00`,
        ),
      ),
  ],
] as const;
export function adaptApiTimestamp(input: string): string {
  for (const [regex, replacement] of timestampFormatVariants) {
    const match = regex.exec(input);
    if (match) {
      return replacement(match).toString();
    }
  }
  throw new Error(`Could not adapt date: ${input}`);
}
