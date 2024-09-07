import { builtinModules } from "node:module";
import type { AddressInfo } from "node:net";
import path from "node:path";

import type { ConfigEnv, Plugin, UserConfig, ViteDevServer } from "vite";

import pkg from "../package.json";

export const builtins = [
  "electron",
  "electron/browser",
  "electron/main",
  "electron/shared",
  ...builtinModules.map((m) => [m, `node:${m}`]).flat(),
];

export const external = [
  ...builtins,
  ...Object.keys(
    "dependencies" in pkg
      ? (pkg.dependencies as Record<string, string | undefined>)
      : {},
  ),
];

export function getBuildConfig(env: ConfigEnv<"build">): UserConfig {
  const { root, mode, command } = env;

  return {
    root: root ?? path.join(import.meta.dirname, ".."),
    mode,
    build: {
      // Prevent multiple builds from interfering with each other.
      emptyOutDir: false,
      // 🚧 Multiple builds may conflict.
      outDir: ".vite/build",
      watch: command === "serve" ? {} : null,
      sourcemap: command === "serve",
      minify: command === "build",
      target: "ES2022",
    },
    clearScreen: false,
  };
}

function getDefineKeysFor(name: string): VitePluginRuntimeKeys {
  const NAME = name.toUpperCase();
  return {
    VITE_DEV_SERVER_URL: `${NAME}_VITE_DEV_SERVER_URL`,
    VITE_NAME: `${NAME}_VITE_NAME`,
  };
}

function getDefinesFor(
  command: string,
  name: string,
): Record<string, string | undefined> {
  const { VITE_DEV_SERVER_URL, VITE_NAME } = getDefineKeysFor(name);
  return {
    [VITE_DEV_SERVER_URL]:
      command === "serve"
        ? JSON.stringify(process.env[VITE_DEV_SERVER_URL])
        : undefined,
    [VITE_NAME]: JSON.stringify(name),
  };
}

export function getBuildDefine(
  env: ConfigEnv<"build">,
): Record<string, string | undefined> {
  const { command, forgeConfig } = env;

  const defines = (forgeConfig?.renderer ?? [])
    .filter(({ name }) => name != null)
    .map(({ name }) => getDefinesFor(command, name!));

  return Object.assign({}, ...defines) as Record<string, string | undefined>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Process {
      viteDevServers?: Record<string, ViteDevServer>;
    }
  }
}

export function pluginExposeRenderer(name: string): Plugin {
  const { VITE_DEV_SERVER_URL } = getDefineKeysFor(name);

  return {
    name: "@electron-forge/plugin-vite:expose-renderer",
    configureServer(server) {
      process.viteDevServers ??= {};
      // Expose server for preload scripts hot reload.
      process.viteDevServers[name] = server;

      server.httpServer?.once("listening", () => {
        const addressInfo = server.httpServer!.address() as AddressInfo;
        // Expose env constant for main process use.
        process.env[VITE_DEV_SERVER_URL] =
          `http://localhost:${addressInfo.port.toString()}`;
      });
    },
  };
}

/**
 * A plugin which forces all known renderer dev servers to reload the app.
 * This is useful to propagate changes in the `preload` script.
 */
export function pluginFullReload(): Plugin {
  return {
    name: "@electron-forge/plugin-vite:force-reload",
    closeBundle() {
      for (const server of Object.values(process.viteDevServers ?? {})) {
        // Preload scripts force hot reload.
        // TODO: Figure out how to adapt the new API.
        //       Might wait until guidance from electron-forge is available.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        server.hot.send({ type: "full-reload" });
      }
    },
  };
}

/**
 * Restarts the main process if changes to the main script have been detected.
 */
export function pluginHotRestart(): Plugin {
  return {
    name: "@electron-forge/plugin-vite:hot-restart",
    closeBundle() {
      // Main process hot restart.
      // https://github.com/electron/forge/blob/v7.2.0/packages/api/core/src/api/start.ts#L216-L223
      process.stdin.emit("data", "rs");
    },
  };
}
