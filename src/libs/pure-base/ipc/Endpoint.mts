import { RemoteProcedureCallDispatcher } from "./RemoteProcedures/index.mjs";
import { RemoteReduxActionReceiver } from "./RemoteReduxActions/index.mjs";

export interface IpcEndpoint {
  readonly dispatcher: RemoteProcedureCallDispatcher;
  readonly actionReceiver: RemoteReduxActionReceiver;
}
