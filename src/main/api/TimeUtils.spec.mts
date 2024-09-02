import { describe, expect, it } from "vitest";

import { adaptApiTimestamp } from "./TimeUtils.mjs";

describe("TimeUtils", () => {
  it.each([
    ["2013-11-11", "2013-11-11T00:00:00Z"],
    ["2013-03-13", "2013-03-13T00:00:00Z"],
    ["2013-01-12", "2013-01-12T00:00:00Z"],
    ["2012-01-01", "2012-01-01T00:00:00Z"],
  ])("should parse a search page date", (timestamp, expected) => {
    expect(adaptApiTimestamp(timestamp)).toBe(expected);
  });

  it.each([
    ["03/17/2024", "2024-03-17T00:00:00Z"],
    ["06/14/2024", "2024-06-14T00:00:00Z"],
  ])("should parse imperial dates", (timestamp, expected) => {
    expect(adaptApiTimestamp(timestamp)).toBe(expected);
  });

  it.each([["|01 Oct 2017|, 18:57", "2017-10-01T22:57:00Z"]])(
    "should parse the custom tfgames.site datetime format",
    (timestamp, expected) => {
      expect(adaptApiTimestamp(timestamp)).toBe(expected);
    },
  );
});
