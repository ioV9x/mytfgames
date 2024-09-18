import { AppConfigurationTree } from "$node-base/configuration";
import { makeServiceIdentifier } from "$node-base/utils";

const AppConfigurationLoader = makeServiceIdentifier<AppConfigurationLoader>(
  "app configuration loader",
);
interface AppConfigurationLoader {
  loadConfiguration(): AppConfigurationTree;
}
export { AppConfigurationLoader };
