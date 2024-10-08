import "./index.scss";

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";

import services from "$ipc/main-renderer";
import { forgeRemoteServiceCollection } from "$pure-base/ipc";

import { store } from "./dux/index.mjs";
import { BrowserIpcEndpoint } from "./ipc/BrowserIpcEndpoint.mts";
import { IpcContext } from "./ipc/IpcContext.mts";
import App from "./ui/App.tsx";

window.addEventListener("message", main, { passive: true });

function main(ev: MessageEvent) {
  if (ev.data !== "main-world-port") {
    return;
  }
  window.removeEventListener("message", main);

  const port = ev.ports[0];
  if (port == null) {
    // eslint-disable-next-line no-console
    console.error(`Initialization "main-world-port" message had no port.`);
    document.getElementById("root")!.innerText =
      'Initialization error: "main-world-port" message had no port.';
    return;
  }
  const endpoint = new BrowserIpcEndpoint(port, store);
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
