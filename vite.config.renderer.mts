import path, { join } from "node:path";

import react from "@vitejs/plugin-react";
import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig } from "vite";

import { pluginExposeRenderer } from "./vite.base.config.mjs";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"renderer">;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf?.name ?? "";

  return {
    root: join(root, "src", name),
    mode,
    base: "./",
    build: {
      outDir: join(root, `.vite`, name),
    },
    plugins: [react({}), pluginExposeRenderer(name)],
    resolve: {
      preserveSymlinks: true,
      // ts-config-paths doesn't seem to be working with react (or root?) 🤷‍♀️
      alias: {
        "$ipc/core": path.join(import.meta.dirname, "src/ipc/core/index.mjs"),
        "$ipc/main-renderer": path.join(
          import.meta.dirname,
          "src/ipc/main-renderer/index.mjs",
        ),
        "$renderer/utils": path.join(
          import.meta.dirname,
          "src/renderer/utils/index.mjs",
        ),
      },
    },
    clearScreen: false,
  } as UserConfig;
});
