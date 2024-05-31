import * as fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { GamesApiImpl } from "./games.mjs";

vi.mock("electron/main", () => ({ net: null }));

describe("Games API", () => {
  it("should parse a list response", () => {
    const response = fs.readFileSync(
      path.join(import.meta.dirname, "test/search-multimedia-32.html"),
      "utf8",
    );

    const subject = new GamesApiImpl();
    const result = subject.parseGameList(response);
    expect(result).toMatchSnapshot();
  });
});
