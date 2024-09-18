import { makeServiceIdentifier } from "$node-base/utils";
import { type RemoteReduxActionSender } from "$pure-base/ipc";

const RemoteReduxActionSender = makeServiceIdentifier<RemoteReduxActionSender>(
  "remote redux action receiver",
);
export { RemoteReduxActionSender };
