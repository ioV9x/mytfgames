import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config.main.mjs";

export default defineConfig((configEnv) => viteConfig(configEnv));
