import { describe, expect, it } from "vitest";

import {
  flipDirection,
  flipDirectionIf,
  isSortDirection,
  nearestPage,
  paginationSettingsFromQuery,
  paginationSlice,
  SortDirection,
} from "./entities.mts";

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

describe("paginationSettingsFromQuery", () => {
  it("should parse the query", () => {
    const query = new URLSearchParams("page=2&pageSize=10&sort=DESC");
    const settings = paginationSettingsFromQuery(query);
    expect(settings).toEqual({
      page: 2,
      pageSize: 10,
      sort: SortDirection.Desc,
    });
  });

  it("should handle missing values", () => {
    const query = new URLSearchParams();
    const settings = paginationSettingsFromQuery(query);
    expect(settings).toEqual({
      page: 1,
      pageSize: 20,
      sort: SortDirection.Asc,
    });
  });

  it("should use provided defaults", () => {
    const query = new URLSearchParams();
    const settings = paginationSettingsFromQuery(query, {
      page: 1,
      pageSize: 20,
      sort: SortDirection.Desc,
    });
    expect(settings).toEqual({
      page: 1,
      pageSize: 20,
      sort: SortDirection.Desc,
    });
  });

  it("should handle invalid values", () => {
    const query = new URLSearchParams(
      "page=invalid&pageSize=invalid&sort=invalid",
    );
    const settings = paginationSettingsFromQuery(query);
    expect(settings).toEqual({
      page: 1,
      pageSize: 20,
      sort: SortDirection.Asc,
    });
  });
});

describe("pagination", () => {
  it("should correctly find the nearest page", () => {
    expect(nearestPage({ page: 1, pageSize: 20 }, 20)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 10)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 30)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 40)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 15)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 25)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 35)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 45)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 5)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 50)).toBe(1);

    expect(nearestPage({ page: 2, pageSize: 20 }, 20)).toBe(2);
    expect(nearestPage({ page: 2, pageSize: 20 }, 10)).toBe(3);
    expect(nearestPage({ page: 2, pageSize: 20 }, 30)).toBe(1);
    expect(nearestPage({ page: 2, pageSize: 20 }, 40)).toBe(1);
    expect(nearestPage({ page: 2, pageSize: 20 }, 15)).toBe(2);

    expect(nearestPage({ page: 3, pageSize: 20 }, 20)).toBe(3);
    expect(nearestPage({ page: 3, pageSize: 20 }, 10)).toBe(5);

    expect(nearestPage({ page: 3, pageSize: 10 }, 20)).toBe(2);
    expect(nearestPage({ page: 3, pageSize: 10 }, 10)).toBe(3);
    expect(nearestPage({ page: 3, pageSize: 10 }, 30)).toBe(1);
  });

  it("should handle edge cases", () => {
    expect(nearestPage({ page: 1, pageSize: 1 }, 1)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 1 }, 2)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 1 }, 10)).toBe(1);

    expect(nearestPage({ page: 1, pageSize: 10 }, 1)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 10 }, 2)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 10 }, 10)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 10 }, 11)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 10 }, 20)).toBe(1);

    expect(nearestPage({ page: 1, pageSize: 20 }, 1)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 2)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 10)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 11)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 20)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 21)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, 30)).toBe(1);

    expect(nearestPage({ page: 1, pageSize: 20 }, 0)).toBe(1);
    expect(nearestPage({ page: 1, pageSize: 20 }, -1)).toBe(1);
  });

  it("should slice items", () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    expect(paginationSlice({ page: 1, pageSize: 20 }, items)).toEqual(
      items.slice(0, 20),
    );
    expect(paginationSlice({ page: 2, pageSize: 20 }, items)).toEqual(
      items.slice(20, 40),
    );
    expect(paginationSlice({ page: 5, pageSize: 20 }, items)).toEqual(
      items.slice(80, 100),
    );

    expect(
      paginationSlice({ page: 1, pageSize: 20 }, items, SortDirection.Desc),
    ).toEqual(items.slice(80, 100).reverse());
  });
});
