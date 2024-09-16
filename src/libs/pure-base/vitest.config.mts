import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig((_configEnv) => {
  const root = import.meta.dirname;
  return {
    root,
    test: {
      name: "pure-base",
      root,
      include: ["**/*.spec.mts"],
    },
    plugins: [
      tsconfigPaths({
        root,
        projects: ["tsconfig.pure-base.json"],
      }),
    ],
  };
});
