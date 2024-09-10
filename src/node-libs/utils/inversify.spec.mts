import { describe, expect, it } from "vitest";

import { makeServiceIdentifier } from "./inversify.mjs";

describe("utils/inversify", () => {
  describe("makeServiceIdentifier", () => {
    it("should create symbols for description strings", () => {
      const id1 = makeServiceIdentifier("id");
      const id2 = makeServiceIdentifier("id");
      expect(id1).toBeTypeOf("symbol");
      expect(id2).toBeTypeOf("symbol");
      expect(id1).not.toBe(id2);
    });
    it("should forward existing symbols", () => {
      const existingId = Symbol("id");
      const serviceId = makeServiceIdentifier(existingId);
      expect(serviceId).toBe(existingId);
    });
  });
});
