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
  it("should parse a viewgame response", () => {
    const response = fs.readFileSync(
      path.join(import.meta.dirname, "test/viewgame-1445-secretary.html"),
      "utf8",
    );

    const subject = new GamesApiImpl();
    const result = subject.parseGameDetails(1445, response);
    expect(result).toMatchSnapshot();
  });
  it("should parse a viewgame response 2", () => {
    const response = fs.readFileSync(
      path.join(import.meta.dirname, "test/viewgame-3227-slat.html"),
      "utf8",
    );

    const subject = new GamesApiImpl();
    const result = subject.parseGameDetails(3227, response);
    expect(result).toMatchSnapshot();
  });
});
