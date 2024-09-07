/// <reference types="vite/client" />
/// <reference types="electron" />
import { ipcRenderer } from "electron/renderer";

// We need to wait until the main world is ready to receive the message before
// sending the port. We create this promise in the preload so it's guaranteed
// to register the onload listener before the load event is fired.
const windowLoaded = new Promise((resolve) => {
  window.addEventListener("load", resolve, { once: true, passive: true });
});
const appOrigin = RENDERER_VITE_DEV_SERVER_URL ?? "app://renderer.invalid";

void windowLoaded.then(() => {
  if (location.origin === appOrigin) {
    const { port1, port2 } = new MessageChannel();
    ipcRenderer.postMessage("register", {}, [port1]);
    window.postMessage("main-world-port", appOrigin, [port2]);
  }
});
