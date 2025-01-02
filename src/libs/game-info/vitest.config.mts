import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, type ViteUserConfig } from "vitest/config";

export default defineConfig((_configEnv): ViteUserConfig => {
  const root = import.meta.dirname;
  return {
    root,
    test: {
      name: "game-info",
      root,
      include: ["**/*.spec.mts"],
    },
    plugins: [
      tsconfigPaths({
        root,
        projects: ["tsconfig.game-info.json"],
      }),
    ],
  };
});
