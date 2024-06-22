export enum EntityRetrievalState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}

export type SortDirection = "ASC" | "DESC";
export function flipDirection(direction: SortDirection): SortDirection {
  return direction === "ASC" ? "DESC" : "ASC";
}
export function flipDirectionIf(
  direction: SortDirection,
  condition: boolean,
): SortDirection {
  return condition ? flipDirection(direction) : direction;
}

export interface Page {
  page: number;
  pageSize: number;
}
export function nearestPage(current: Page, newPageSize: number) {
  return Math.max(
    1,
    Math.floor(((current.page - 1) * current.pageSize) / newPageSize + 1),
  );
}
export function paginationSlice<T>(
  { page, pageSize }: Page,
  items: readonly T[],
  direction: SortDirection = "ASC",
) {
  // TODO: optimize by flipping the offset calculation
  if (direction === "DESC") {
    items = [...items].reverse();
  }
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}
export function upsert<
  K extends string | number,
  T extends object,
  TUpdates extends Partial<T>[],
>(record: Partial<Record<K, T>>, id: K, ...updates: TUpdates) {
  let current = record[id];
  if (current == null) {
    current = record[id] = Object.create(null) as T;
  }
  Object.assign(current, ...updates);
}
