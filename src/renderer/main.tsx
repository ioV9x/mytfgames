import "./index.scss";

import { unstable_FeatureFlags as FeatureFlags } from "@carbon/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";

import services from "$ipc/main-renderer";
import { forgeRemoteServiceCollection } from "$pure-base/ipc";

import { loadArtifactPlatforms } from "./dux/game-versions.mts";
import { store } from "./dux/index.mjs";
import { thunkExtra } from "./dux/thunk-extra.mts";
import { BrowserIpcEndpoint } from "./ipc/BrowserIpcEndpoint.mts";
import { IpcContext } from "./ipc/IpcContext.mts";
import App from "./ui/App.tsx";

window.addEventListener("message", main, { passive: true });
document.getElementById("root")!.innerText =
  "Awaiting message port for initialization...";

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
  (thunkExtra as typeof thunkExtra & { services: typeof services }).services =
    boundservices;
  fetchInitialData(store, boundservices);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <FeatureFlags
        enableV12DynamicFloatingStyles
        enableV12Overflowmenu
        enableV12TileDefaultIcons
        enableV12TileRadioIcons
      >
        <IpcContext value={boundservices}>
          <ReduxProvider store={store}>
            <App />
          </ReduxProvider>
        </IpcContext>
      </FeatureFlags>
    </React.StrictMode>,
  );
}

function fetchInitialData(s: typeof store, boundServices: typeof services) {
  s.dispatch(
    loadArtifactPlatforms({ gameVersions: boundServices.gameVersions }),
  ).catch((error: unknown) => console.error(error));
}
