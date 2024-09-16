import { RemoteServiceShape } from "./RemoteService.mjs";

export type RemoteServiceCollectionShape = Record<
  string,
  RemoteServiceShape | undefined
>;

export function makeRemoteServiceCollectionDescriptor<
  T extends RemoteServiceCollectionShape,
>(proto: T): Readonly<T> {
  return Object.freeze(Object.assign(Object.create(null) as object, proto));
}
