import { isSortDirection, SortDirection } from "$pure-base/utils";

export const emptyArray: readonly [] = Object.freeze([]);

export enum EntityRetrievalState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}

const integerRegex = /^\d{1,15}$/;
export function paginationSettingsFromQuery(
  query: URLSearchParams,
  defaults: Page & { sort: SortDirection } = {
    page: 1,
    pageSize: 20,
    sort: SortDirection.Asc,
  },
) {
  const serializedPage = query.get("page");
  const serializedPageSize = query.get("pageSize");
  const serializedSortDirection = query.get("sort");
  return {
    page: serializedPage?.match(integerRegex)
      ? parseInt(serializedPage, 10)
      : defaults.page,
    pageSize: serializedPageSize?.match(integerRegex)
      ? parseInt(serializedPageSize, 10)
      : defaults.pageSize,
    sort: isSortDirection(serializedSortDirection)
      ? serializedSortDirection
      : defaults.sort,
  };
}

export interface Page {
  page: number;
  pageSize: number;
}
export function nearestPage(current: Page, newPageSize: number) {
  newPageSize = Math.max(1, newPageSize);
  return Math.max(
    1,
    Math.floor(((current.page - 1) * current.pageSize) / newPageSize + 1),
  );
}
export function paginationSlice<T>(
  { page, pageSize }: Page,
  items: readonly T[],
  direction: SortDirection = SortDirection.Asc,
) {
  // TODO: optimize by flipping the offset calculation
  if (direction === SortDirection.Desc) {
    items = [...items].reverse();
  }
  const offset = (page - 1) * pageSize;
  return items.slice(offset, offset + pageSize);
}
export function upsert<K extends string | number, T extends object>(
  record: Partial<Record<K, T>>,
  id: K,
  ...updates: Partial<T>[]
) {
  let current = record[id];
  if (current == null) {
    current = record[id] = Object.create(null) as T;
  }
  Object.assign(current, ...updates);
}
