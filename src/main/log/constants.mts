import type Logger from "bunyan";

import { makeServiceIdentifier } from "$node-base/utils";

export const LogCategoryKey = Symbol("app:log_category");

export const BaseLogger = makeServiceIdentifier<Logger>("base-logger");
