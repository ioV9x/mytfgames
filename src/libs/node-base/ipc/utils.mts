import { ContainerModuleLoadOptions, ServiceIdentifier } from "inversify";

import { makeServiceIdentifier } from "$node-base/utils";
import {
  forgeRemoteServiceCollection,
  IpcEndpoint,
  isRemoteServiceShape,
  RemoteServiceCollectionShape,
  RemoteServiceId,
} from "$pure-base/ipc";

export function bindIpcServices(
  { bind }: ContainerModuleLoadOptions,
  endpointId: ServiceIdentifier<IpcEndpoint>,
  proto: RemoteServiceCollectionShape,
): void {
  const serviceCollectionId = makeServiceIdentifier<typeof proto>(
    "remote service collection",
  );

  bind(serviceCollectionId)
    .toResolvedValue(
      (endpoint) => forgeRemoteServiceCollection(endpoint, proto),
      [endpointId],
    )
    .inSingletonScope();

  for (const [key, serviceDescriptor] of Object.entries(proto).filter(
    ([, descriptor]) => isRemoteServiceShape(descriptor),
  )) {
    bind(serviceDescriptor![RemoteServiceId])
      .toResolvedValue(
        (serviceCollection) => serviceCollection[key],
        [serviceCollectionId],
      )
      .inSingletonScope();
  }
}
