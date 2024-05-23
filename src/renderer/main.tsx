import "./index.scss";

import React from "react";
import ReactDOM from "react-dom/client";

import { forgeRemoteServiceCollection } from "$ipc/core";
import services from "$ipc/main-renderer";

import App from "./App.tsx";
import { BrowserIpcEndpoint } from "./ipc/BrowserIpcEndpoint.mts";
import { IpcContext } from "./ipc/IpcContext.mts";

window.addEventListener(
  "message",
  (ev) => {
    const endpoint = new BrowserIpcEndpoint(ev.ports[0]!);
    const xservices = forgeRemoteServiceCollection(endpoint, services);

    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <IpcContext.Provider value={xservices}>
          <App />
        </IpcContext.Provider>
      </React.StrictMode>,
    );
  },
  { once: true, passive: true },
);
