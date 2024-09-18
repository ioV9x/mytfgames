export const RemoteServiceId = Symbol("remote service id");
export const RemoteServiceKey = Symbol("remote service key");

export interface RemoteServiceShape<Key extends string = string> {
  readonly [RemoteServiceId]: symbol;
  readonly [RemoteServiceKey]: Key;
}
export interface RemoteServiceMeta<Key extends string = string> {
  readonly [RemoteServiceId]: symbol;
  readonly [RemoteServiceKey]: Key;
}

export function makeRemoteServiceDescriptor<
  Id extends string,
  T extends object,
>(serviceKey: Id, proto: T): Readonly<T> & RemoteServiceMeta<Id> {
  return Object.freeze(
    Object.assign(Object.create(null) as Record<string, undefined>, proto, {
      [RemoteServiceId]: Symbol(`remote service ${serviceKey}`),
      [RemoteServiceKey]: serviceKey,
    }),
  );
}

export function isRemoteServiceShape(
  service: unknown,
): service is RemoteServiceShape {
  return (
    typeof service === "object" &&
    service != null &&
    RemoteServiceId in service &&
    typeof service[RemoteServiceId] === "symbol" &&
    RemoteServiceKey in service &&
    typeof service[RemoteServiceKey] === "string"
  );
}
