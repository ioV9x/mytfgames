import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";

import {
  external,
  getBuildConfig,
  getBuildDefine,
  pluginFullReload,
} from "./vite.base.config.mjs";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"build">;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);
  const config: UserConfig = {
    build: {
      rollupOptions: {
        external: ["electron/renderer", ...external],
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        input: forgeConfigSelf.entry!,
        output: {
          format: "cjs",
          // It should not be split chunks.
          inlineDynamicImports: true,
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    },
    define,
    plugins: [pluginFullReload()],
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
