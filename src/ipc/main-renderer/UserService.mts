import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$ipc/core";

export const UserService = makeRemoteServiceDescriptor("user:base", {
  isLoggedIn: makeRemoteProcedureDescriptor<[], boolean>(),
});
