import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import {
  external,
  getBuildConfig,
  getBuildDefine,
} from "./vite.base.config.mjs";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"build">;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);
  const config: UserConfig = {
    build: {
      lib: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        entry: forgeConfigSelf.entry!,
        fileName: () => "[name].mjs",
        formats: ["es"],
      },
      rollupOptions: {
        external,
      },
    },
    // plugins: [pluginHotRestart('restart')],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
    plugins: [
      tsconfigPaths({
        projects: ["tsconfig.main.json"],
      }),
    ],
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
