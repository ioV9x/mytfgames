import "./index.scss";

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";

import { forgeRemoteServiceCollection } from "$ipc/core";
import services from "$ipc/main-renderer";

import App from "./app/App.tsx";
import { store } from "./app/store.mts";
import { BrowserIpcEndpoint } from "./ipc/BrowserIpcEndpoint.mts";
import { IpcContext } from "./ipc/IpcContext.mts";

window.addEventListener("message", main, { passive: true });

function main(ev: MessageEvent) {
  if (ev.data !== "main-world-port") {
    return;
  }
  window.removeEventListener("message", main);

  const endpoint = new BrowserIpcEndpoint(ev.ports[0]!);
  const boundservices = forgeRemoteServiceCollection(endpoint, services);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <IpcContext.Provider value={boundservices}>
        <ReduxProvider store={store}>
          <App />
        </ReduxProvider>
      </IpcContext.Provider>
    </React.StrictMode>,
  );
}
