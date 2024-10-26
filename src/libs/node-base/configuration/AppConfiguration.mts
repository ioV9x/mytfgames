import { makeServiceIdentifier } from "$node-base/utils";

export interface ConfigurationInput {
  readonly paths?: {
    readonly database?: string;
    readonly blob_store?: string;
    readonly logs?: string;
    readonly session_data?: string;
    readonly user_data?: string;
  };

  readonly proxy?:
    | {
        mode: "direct" | "system" | "auto_detect";
      }
    | {
        mode: "fixed_servers";
        proxyRules: string;
        proxyBypassRules?: string;
      };
}

const AppConfigurationTree = makeServiceIdentifier<AppConfigurationTree>(
  "app configuration tree",
);
type AppConfigurationTree = ConfigurationInput & {
  readonly paths: {
    readonly database: string;
    readonly blob_store: string;
    readonly logs: string;
    readonly session_data: string;
    readonly user_data: string;
    readonly config_dir: string;
    readonly renderer_app: string;
  };
};
export { AppConfigurationTree };

const AppConfiguration =
  makeServiceIdentifier<AppConfiguration>("app configuration");
interface AppConfiguration {
  readonly root: AppConfigurationTree;
}
export { AppConfiguration };
