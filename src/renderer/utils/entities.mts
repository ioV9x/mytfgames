export enum EntityRetrievalState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
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
) {
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
