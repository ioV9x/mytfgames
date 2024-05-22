import { createContext } from "react";

import services from "$ipc/main-renderer";

export const IpcContext = createContext<typeof services | undefined>(undefined);
