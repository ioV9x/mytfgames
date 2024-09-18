import "reflect-metadata/lite";

import { expect } from "vitest";

expect.addSnapshotSerializer({
  serialize(val: URLSearchParams, config, indentation, depth, refs, printer) {
    return printer([...val.entries()], config, indentation, depth, refs);
  },
  test(val) {
    return val instanceof URLSearchParams;
  },
});
expect.addSnapshotSerializer({
  serialize(val: AbortSignal, config, indentation, depth, refs, printer) {
    return printer(
      {
        aborted: val.aborted,
        reason: val.reason as unknown,
      },
      config,
      indentation,
      depth,
      refs,
    );
  },
  test(val) {
    return val instanceof AbortSignal;
  },
});
