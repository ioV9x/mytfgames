import { createContext, useContext } from "react";

import type services from "$ipc/main-renderer";

export const IpcContext = createContext<typeof services | null>(null);
export function useIpc(): typeof services {
  const ipc = useContext(IpcContext);
  if (ipc !== null) {
    return ipc;
  }
  throw new Error("useIpc must be used within an IpcContext.Provider");
}
