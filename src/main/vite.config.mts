import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import {
  external,
  getBuildConfig,
  getBuildDefine,
  pluginHotRestart,
} from "../../tools/vite.base.config.mjs";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"build">;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);
  const buildConfig = getBuildConfig(forgeEnv);
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
      name: "main",
      root: buildConfig.root!,
      setupFiles: ["src/main/setupTests.mts"],
      include: ["src/main/**/*.spec.mts", "src/ipc/**/*.spec.mts"],
    },
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
    plugins: [
      tsconfigPaths({
        projects: ["src/main/tsconfig.main.json"],
      }),
      pluginHotRestart(),
    ],
  };

  return mergeConfig(buildConfig, config);
});
