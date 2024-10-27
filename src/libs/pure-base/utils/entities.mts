import * as R from "remeda";

export enum SortDirection {
  Asc = "ASC",
  Desc = "DESC",
}
const SortDirectionValues: readonly string[] = Object.freeze(
  R.unique(Object.values(SortDirection)).sort(),
);
export function isSortDirection(value: unknown): value is SortDirection {
  return (
    typeof value === "string" &&
    SortDirectionValues[SortDirectionValues.indexOf(value)] === value
  );
}

export const ToKyselySortDirection = Object.freeze({
  [SortDirection.Asc]: "asc",
  [SortDirection.Desc]: "desc",
});

export function flipDirection(direction: SortDirection): SortDirection {
  return direction === SortDirection.Asc
    ? SortDirection.Desc
    : SortDirection.Asc;
}
export function flipDirectionIf(
  direction: SortDirection,
  condition: boolean,
): SortDirection {
  return condition ? flipDirection(direction) : direction;
}
