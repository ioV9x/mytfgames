const AggregatedErrorType = Symbol.for(
  "io.gitgud/ioV9x/mytfgames#AggregatedError",
);
export interface AggregatedError extends Error {
  readonly [AggregatedErrorType]: true;
  readonly causes: readonly unknown[];
}

export function isAggregatedError(error: unknown): error is AggregatedError {
  return (
    typeof error === "object" &&
    error !== null &&
    AggregatedErrorType in error &&
    error[AggregatedErrorType] === true
  );
}

class $AggregatedError extends Error implements AggregatedError {
  get [AggregatedErrorType]() {
    return true as const;
  }

  constructor(readonly causes: readonly unknown[]) {
    super("Multiple errors occurred");
  }
}
export function makeAggregatedError(
  causes: readonly unknown[],
): AggregatedError {
  return new $AggregatedError(causes);
}
