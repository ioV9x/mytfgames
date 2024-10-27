import { describe, expect, it } from "vitest";

import {
  flipDirection,
  flipDirectionIf,
  isSortDirection,
  SortDirection,
} from "./entities.mjs";

describe("SortDirection", () => {
  it("should have an 'ASC' value", () => {
    expect(SortDirection.Asc).toBe("ASC");
    expect(isSortDirection(SortDirection.Asc)).toBe(true);
    expect(isSortDirection("ASC")).toBe(true);
  });

  it("should have a 'DESC' value", () => {
    expect(SortDirection.Desc).toBe("DESC");
    expect(isSortDirection(SortDirection.Desc)).toBe(true);
    expect(isSortDirection("DESC")).toBe(true);
  });

  it("should not have other values", () => {
    expect(isSortDirection("asc")).toBe(false);
    expect(isSortDirection("Asc")).toBe(false);
    expect(isSortDirection("ASCENDING")).toBe(false);
    expect(isSortDirection("desc")).toBe(false);
    expect(isSortDirection("Desc")).toBe(false);
    expect(isSortDirection("DESCENDING")).toBe(false);
    expect(isSortDirection("")).toBe(false);
    expect(isSortDirection(null)).toBe(false);
    expect(isSortDirection(undefined)).toBe(false);
  });

  it("should have a flip function", () => {
    expect(flipDirection(SortDirection.Asc)).toBe(SortDirection.Desc);
    expect(flipDirection(SortDirection.Desc)).toBe(SortDirection.Asc);
  });

  it("should have a conditional flip function", () => {
    expect(flipDirectionIf(SortDirection.Asc, true)).toBe(SortDirection.Desc);
    expect(flipDirectionIf(SortDirection.Asc, false)).toBe(SortDirection.Asc);
    expect(flipDirectionIf(SortDirection.Desc, true)).toBe(SortDirection.Asc);
    expect(flipDirectionIf(SortDirection.Desc, false)).toBe(SortDirection.Desc);
  });
});
