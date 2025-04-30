import type { CustomScheme, Session } from "electron/main";

import { makeServiceIdentifier } from "$node-base/utils";

export const BrowserSessionTypeId = Symbol("browser session");
export interface BrowserSession {
  readonly type: typeof BrowserSessionTypeId;
}
export function isBrowserSession(v: object): v is BrowserSession {
  return "type" in v && v.type === BrowserSessionTypeId;
}

export const CustomProtocolScheme = makeServiceIdentifier<CustomScheme>(
  "custom protocol scheme",
);

interface BrowserSessionConfigurer {
  configure(nativeSession: Session): BrowserSession | Promise<BrowserSession>;
  dereference(browserSession: BrowserSession): Session;
}
const BrowserSessionConfigurer =
  makeServiceIdentifier<BrowserSessionConfigurer>("browser session configurer");
export { BrowserSessionConfigurer };
