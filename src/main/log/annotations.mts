import { createTaggedDecorator, inject } from "inversify";

import { CategoryLogger, LogCategoryKey } from "./constants.mjs";

export function logger(category: string) {
  const withCategory = createTaggedDecorator({
    key: LogCategoryKey,
    value: category,
  });
  const injectLogger = inject(CategoryLogger);
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    withCategory(target, propertyKey, parameterIndex);
    injectLogger(target, propertyKey, parameterIndex);
  };
}
