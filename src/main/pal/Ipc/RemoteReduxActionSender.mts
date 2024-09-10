import { type RemoteReduxActionSender } from "$ipc/core";
import { makeServiceIdentifier } from "$node-libs/utils";

const RemoteReduxActionSender = makeServiceIdentifier<RemoteReduxActionSender>(
  "remote redux action receiver",
);
export { RemoteReduxActionSender };
