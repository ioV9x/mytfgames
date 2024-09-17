import { interfaces } from "inversify";

import { makeServiceIdentifier } from "$node-base/utils";
import {
  forgeRemoteServiceCollection,
  IpcEndpoint,
  isRemoteServiceShape,
  RemoteServiceCollectionShape,
  RemoteServiceId,
} from "$pure-base/ipc";

export function bindIpcServices(
  bind: interfaces.Bind,
  endpoint: interfaces.ServiceIdentifier<IpcEndpoint>,
  proto: RemoteServiceCollectionShape,
): void {
  const serviceCollectionId = makeServiceIdentifier<typeof proto>(
    "remote service collection",
  );

  bind(serviceCollectionId)
    .toDynamicValue((context) =>
      forgeRemoteServiceCollection(context.container.get(endpoint), proto),
    )
    .inSingletonScope();

  for (const [key, serviceDescriptor] of Object.entries(proto).filter(
    ([, descriptor]) => isRemoteServiceShape(descriptor),
  )) {
    bind(serviceDescriptor![RemoteServiceId])
      .toDynamicValue(
        (context) => context.container.get(serviceCollectionId)[key],
      )
      .inSingletonScope();
  }
}
