import type AjvImpl from "ajv/dist/jtd";

import { makeServiceIdentifier } from "./inversify.mjs";

const Ajv = makeServiceIdentifier<AjvImpl>("ajv jtd instance");
type Ajv = AjvImpl;
export { Ajv };
