import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import {
  external,
  getBuildConfig,
  getBuildDefine,
  pluginHotRestart,
} from "./vite.base.config.mjs";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"build">;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);
  const config: UserConfig = {
    build: {
      lib:
        forgeConfigSelf?.entry != null
          ? {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              entry: forgeConfigSelf.entry,
              fileName: () => "[name].mjs",
              formats: ["es"],
            }
          : false,
      rollupOptions: {
        external,
      },
    },
    test: {
      setupFiles: ["src/main/setupTests.mts"],
    },
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
    plugins: [
      tsconfigPaths({
        projects: ["tsconfig.main.json"],
      }),
      pluginHotRestart(),
    ],
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
