import fs from "node:fs";
import path from "node:path";

import type { JTDSchemaType, ValidateFunction } from "ajv/dist/jtd";
import { app } from "electron/main";
import { inject, injectable } from "inversify";
import * as TOML from "smol-toml";

import {
  AppConfigurationTree,
  ConfigurationInput,
} from "$node-base/configuration";
import { Ajv, isErrnoException } from "$node-base/utils";

import { AppConfigurationLoader } from "./AppConfiguration.mjs";

const appConfigurationSchema: JTDSchemaType<ConfigurationInput> = {
  optionalProperties: {
    paths: {
      optionalProperties: {
        database: {
          type: "string",
        },
        blob_store: {
          type: "string",
        },
        logs: {
          type: "string",
        },
        session_data: {
          type: "string",
        },
        user_data: {
          type: "string",
        },
      },
    },
    proxy: {
      discriminator: "mode",
      mapping: {
        direct: {
          properties: {},
        },
        system: {
          properties: {},
        },
        auto_detect: {
          properties: {},
        },
        fixed_servers: {
          properties: {
            proxyRules: {
              type: "string",
            },
          },
          optionalProperties: {
            proxyBypassRules: {
              type: "string",
            },
          },
        },
      },
    },
  },
};

@injectable()
export class ElectronAppConfigurationLoader implements AppConfigurationLoader {
  readonly #validate: ValidateFunction<ConfigurationInput>;

  constructor(@inject(Ajv) private readonly ajv: Ajv) {
    this.#validate = this.ajv.compile(appConfigurationSchema);
  }

  loadConfiguration(): AppConfigurationTree {
    const [configurationFilePath, minimal] = this.#tryLoadConfigurationFile();
    const expanded = this.expandConfigurationTree(
      configurationFilePath,
      minimal ?? this.makeDefaultConfiguration(),
    );
    return expanded;
  }
  #tryLoadConfigurationFile(): [string, ConfigurationInput | undefined] {
    const configFileName = "configuration.toml";
    if (!app.isPackaged) {
      return this.#tryLoadSingleConfigurationFile(
        app.getAppPath(),
        "_data",
        configFileName,
      );
    }
    const portableLoadResult = this.#tryLoadSingleConfigurationFile(
      path.dirname(app.getPath("exe")),
      configFileName,
    );
    return portableLoadResult[1]
      ? portableLoadResult
      : this.#tryLoadSingleConfigurationFile(
          app.getPath("userData"),
          configFileName,
        );
  }
  #tryLoadSingleConfigurationFile(
    ...filePathSegments: string[]
  ): [string, ConfigurationInput | undefined] {
    const configFilePath = path.resolve(...filePathSegments);
    try {
      return [configFilePath, this.loadConfigurationFileFrom(configFilePath)];
    } catch (e) {
      if (isErrnoException(e) && e.code === "ENOENT") {
        return [configFilePath, undefined];
      }
      throw e;
    }
  }

  makeDefaultConfiguration(): ConfigurationInput {
    if (app.isPackaged) {
      return {};
    } else {
      return {
        paths: {
          database: "<config-dir>/db.sqlite3",
          blob_store: "<config-dir>/blobs",
          logs: "<config-dir>/logs",
          user_data: "<config-dir>",
          session_data: "<config-dir>/chromium",
        },
      };
    }
  }

  loadConfigurationFileFrom(configurationFilePath: string): ConfigurationInput {
    const configurationFile = fs.readFileSync(configurationFilePath, "utf-8");
    const maybeConfiguration = TOML.parse(configurationFile);
    if (this.#validate(maybeConfiguration)) {
      return maybeConfiguration;
    }
    // TODO: add validation errors to the error object and display them to the user
    throw new Error(
      "invalid configuration file\n" + JSON.stringify(this.#validate.errors),
    );
  }

  expandConfigurationTree(
    configurationFilePath: string,
    minimal: ConfigurationInput,
  ): AppConfigurationTree {
    return {
      ...minimal,
      paths: this.expandConfigPathsTree(configurationFilePath, minimal.paths),
    };
  }

  private expandConfigPathsTree(
    configurationFilePath: string,
    minimal: ConfigurationInput["paths"] = {},
  ): AppConfigurationTree["paths"] {
    const configurationDirectory = path.dirname(configurationFilePath);
    const prefixRegex = /^<([-a-z]+)>(?:\/+(.+))?$/;

    const well_known_prefix_paths = Object.assign(
      Object.create(null) as Record<string, string>,
      {
        "config-dir": configurationDirectory,
        "default-user-data": app.getPath("userData"),
      },
    );
    const resolveConfigPath = (configPath: string) => {
      if (configPath.includes("\\")) {
        // TODO: throw a validation error instead of an error
        throw new Error("path contains backslashes");
      }

      const match = prefixRegex.exec(configPath);
      if (!match) {
        return configPath;
      }
      const [_, prefix, rest] = match as unknown as [string, string, string?];
      const prefixPath = well_known_prefix_paths[prefix];
      if (prefixPath == null) {
        throw new Error(`unknown prefix: ${prefix}`);
      }
      return rest != null ? path.join(prefixPath, rest) : prefixPath;
    };

    return {
      database: resolveConfigPath(
        minimal.database ?? "<default-user-data>/db.sqlite3",
      ),
      blob_store: resolveConfigPath(
        minimal.blob_store ?? "<default-user-data>/blobs",
      ),
      config_dir: configurationDirectory,
      renderer_app: path.resolve(app.getAppPath(), ".vite/renderer"),
      logs: resolveConfigPath(minimal.logs ?? "<default-user-data>/logs"),
      user_data: resolveConfigPath(minimal.user_data ?? "<default-user-data>"),
      session_data: resolveConfigPath(
        minimal.session_data ?? "<default-user-data>/chromium",
      ),
    };
  }
}
