import AjvImpl from "ajv/dist/jtd";
import { ContainerModule } from "inversify";

import { Ajv } from "./ajv-jtd.mjs";

export const UtilsModule = new ContainerModule((bind) => {
  bind(Ajv)
    .toDynamicValue(() => new AjvImpl({ timestamp: "string" }))
    .inSingletonScope();
});
