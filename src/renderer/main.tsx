import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { forgeRemoteServiceCollection } from "$ipc/core";
import services from "$ipc/main-renderer";

import App from "./App.tsx";
import ErrorPage from "./error-page.tsx";
import { BrowserIpcEndpoint } from "./ipc/BrowserIpcEndpoint.mts";
import { IpcContext } from "./ipc/IpcContext.mts";

window.addEventListener(
  "message",
  (ev) => {
    console.log(ev.origin, ev.data, ev.ports);

    const endpoint = new BrowserIpcEndpoint(ev.ports[0]!);
    const xservices = forgeRemoteServiceCollection(endpoint, services);

    const router = createBrowserRouter([
      {
        path: "/",
        element: <App />,
        errorElement: <ErrorPage />,
      },
    ]);

    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <IpcContext.Provider value={xservices}>
          <RouterProvider router={router} />
        </IpcContext.Provider>
      </React.StrictMode>,
    );
  },
  { once: true, passive: true },
);
