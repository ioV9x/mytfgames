import path from "node:path";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig((_configEnv) => {
  const root = path.join(import.meta.dirname, "..");
  return {
    root,
    test: {
      name: "node-libs",
      root,
      include: ["src/node-libs/**/*.spec.mts"],
    },
    plugins: [
      tsconfigPaths({
        root: path.join(root, "src/node-libs"),
        projects: ["utils/tsconfig.json"],
      }),
    ],
  };
});
