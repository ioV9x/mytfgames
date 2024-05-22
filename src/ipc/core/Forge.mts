import { type IpcEndpoint } from "./Endpoint.mjs";
import {
  RemoteProcedureDescriptor,
  RemoteProcedureOptions,
} from "./RemoteProcedures/index.mjs";
import {
  type RemoteServiceCollectionShape,
  RemoteServiceId,
  type RemoteServiceShape,
} from "./RemoteServices/index.mjs";

export function forgeRemoteServiceCollection<
  T extends RemoteServiceCollectionShape,
>(endpoint: IpcEndpoint, proto: T): Readonly<T> {
  const blank = Object.assign(
    Object.create(null) as RemoteServiceCollectionShape,
    proto,
  );
  for (const key in blank) {
    if (typeof key !== "string" || !(key in blank)) {
      continue;
    }
    const serviceBlank = blank[key];
    if (serviceBlank != null && typeof serviceBlank === "object") {
      (blank as RemoteServiceCollectionShape)[key] = forgeRemoteService(
        endpoint,
        serviceBlank,
      );
    }
  }
  return Object.freeze(blank);
}

function forgeRemoteService(
  endpoint: IpcEndpoint,
  proto: RemoteServiceShape,
): RemoteServiceShape {
  const blank = Object.assign(
    Object.create(null) as Record<
      string,
      RemoteProcedureDescriptor<unknown[], unknown> | undefined
    >,
    proto,
  );
  for (const key in blank) {
    if (typeof key !== "string" || !(key in blank)) {
      continue;
    }
    if (typeof blank[key] === "function") {
      const dispatchImpl = function dispatchRpc(
        ...args: unknown[]
      ): Promise<unknown> {
        return endpoint.dispatcher.dispatch(blank[RemoteServiceId], key, args);
      };
      blank[key] = Object.assign(dispatchImpl, {
        [RemoteProcedureOptions]: blank[key]![RemoteProcedureOptions],
      });
    }
  }
  return Object.freeze(blank);
}
