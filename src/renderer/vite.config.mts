import * as path from "node:path";

import react from "@vitejs/plugin-react";
import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { pluginExposeRenderer } from "../../tools/vite.base.config.mjs";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"renderer">;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf?.name ?? "";

  const defaultedRoot = root ?? path.join(import.meta.dirname, "../..");
  return {
    root: import.meta.dirname,
    mode,
    base: "./",
    build: {
      outDir: path.join(defaultedRoot, `.vite`, name),
    },
    plugins: [
      react({}),
      pluginExposeRenderer(name),
      tsconfigPaths({
        projects: ["./tsconfig.renderer.json"],
      }),
    ],
    resolve: {
      preserveSymlinks: true,
    },
    test: {
      name: "renderer",
      root: import.meta.dirname,
      setupFiles: ["setupTests.mts"],
      include: ["**/*.spec.mts"],
    },
    clearScreen: false,
  } as UserConfig;
});
