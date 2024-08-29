import { join } from "node:path";

import react from "@vitejs/plugin-react";
import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
    plugins: [
      react({}),
      pluginExposeRenderer(name),
      tsconfigPaths({
        projects: ["../../tsconfig.renderer.json"],
      }),
    ],
    resolve: {
      preserveSymlinks: true,
    },
    clearScreen: false,
  } as UserConfig;
});
