import {
  makeRemoteProcedureDescriptor,
  makeRemoteServiceDescriptor,
} from "$pure-base/ipc";

export const ShellDialogService = makeRemoteServiceDescriptor("shell:dialogs", {
  openDirectoryChooser: makeRemoteProcedureDescriptor<[], string | null>(),
});
