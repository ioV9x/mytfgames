import type Logger from "bunyan";

import { makeServiceIdentifier } from "$main/utils";

export const LogCategoryKey = Symbol("app:log_category");

const BaseLogger = makeServiceIdentifier<Logger>("base-logger");
const CategoryLogger = makeServiceIdentifier<Logger>("category-logger");

export { BaseLogger, CategoryLogger, Logger };
