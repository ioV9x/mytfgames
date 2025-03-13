import { inject } from "inversify";

import { makeServiceIdentifier } from "$node-base/utils";

import { LOG_CATEGORY_REGISTRY as knownCategories } from "./categories.mjs";
import { Logger } from "./logger.mjs";

export function logger(category: string): ParameterDecorator {
  return inject(
    (knownCategories[category] ??= makeServiceIdentifier<Logger>(category)),
  );
}
