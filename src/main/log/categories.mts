import { ServiceIdentifier } from "inversify";

import { Logger } from "./logger.mjs";

export const LOG_CATEGORY_REGISTRY = Object.create(null) as Partial<
  Record<string, ServiceIdentifier<Logger>>
>;
