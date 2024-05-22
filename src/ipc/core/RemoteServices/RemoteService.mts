export const RemoteServiceId = Symbol("remote service id");

export interface RemoteServiceShape<Id extends string = string> {
  readonly [RemoteServiceId]: Id;
}
export interface RemoteServiceMeta<Id extends string = string> {
  readonly [RemoteServiceId]: Id;
}

export function makeRemoteServiceDescriptor<
  Id extends string,
  T extends object,
>(serviceId: Id, proto: T): Readonly<T> & RemoteServiceMeta<Id> {
  return Object.freeze(
    Object.assign(Object.create(null) as Record<string, undefined>, proto, {
      [RemoteServiceId]: serviceId,
    }),
  );
}
