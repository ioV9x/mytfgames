import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

export const UserService = makeRemoteServiceDescriptor("user:base", {
  isLoggedIn: makeRemoteProcedureDescriptor<[], boolean>(),
});
