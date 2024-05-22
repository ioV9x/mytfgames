import { RemoteProcedureCallDispatcher } from "./RemoteProcedures/index.mjs";

export interface IpcEndpoint {
  readonly dispatcher: RemoteProcedureCallDispatcher;
}
