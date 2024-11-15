import { makeServiceIdentifier } from "$node-base/utils";
import { type RemoteReduxActionSender as IRemoteReduxActionSender } from "$pure-base/ipc";

type RemoteReduxActionSender = IRemoteReduxActionSender;
const RemoteReduxActionSender = makeServiceIdentifier<IRemoteReduxActionSender>(
  "remote redux action receiver",
);
export { RemoteReduxActionSender };
