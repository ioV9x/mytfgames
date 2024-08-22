import { createContext, useContext } from "react";

import services from "$ipc/main-renderer";

export const IpcContext = createContext<typeof services | null>(null);
export function useIpc(): typeof services {
  const ipc = useContext(IpcContext);
  if (ipc == null) {
    throw new Error("useIpc must be used within an IpcContext.Provider");
  }
  return ipc;
}
