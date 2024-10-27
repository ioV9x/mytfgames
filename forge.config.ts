import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
  packagerConfig: {
    asar: false,
  },
  rebuildConfig: {
    onlyModules: ["better-sqlite3"],
    force: true, // better-sqlite3 uses prebuilds, so this is inxepensive
  },
  makers: [new MakerZIP({})],

  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main/main.mts",
          config: "src/main/vite.config.mts",
        },
        {
          entry: "src/preload/preload.ts",
          config: "tools/vite.config.preload.mts",
        },
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/worker/worker.mts",
          config: "src/worker/vite.config.mts",
        },
      ],
      renderer: [
        {
          name: "renderer",
          config: "src/renderer/vite.config.mts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      strictlyRequireAllFuses: true,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
    }),
  ],
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      const requiredNativePackages = [
        "@napi-rs",
        "better-sqlite3",
        "bindings",
        "file-uri-to-path",
      ];

      const sourceNodeModulesPath = path.resolve(__dirname, "node_modules");
      const destNodeModulesPath = path.resolve(buildPath, "node_modules");
      await Promise.all(
        requiredNativePackages.map(async (packageName) => {
          await mkdir(destNodeModulesPath, { recursive: true });

          await cp(
            path.join(sourceNodeModulesPath, packageName),
            path.join(destNodeModulesPath, packageName),
            { recursive: true, preserveTimestamps: true },
          );
        }),
      );
    },
  },
};

export default config;
