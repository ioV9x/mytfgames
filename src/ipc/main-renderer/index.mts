import { makeRemoteServiceCollectionDescriptor } from "$ipc/core";

import { UserService } from "./UserService.mjs";

export * from "./UserService.mjs";

export default makeRemoteServiceCollectionDescriptor({
  user: UserService,
});
