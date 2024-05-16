import type { Session } from "electron/main";

import { makeServiceIdentifier } from "$main/utils";

export const BrowserSessionTypeId = Symbol("browser session");
export interface BrowserSession {
  readonly type: typeof BrowserSessionTypeId;
}
export function isBrowserSession(v: object): v is BrowserSession {
  return "type" in v && v.type === BrowserSessionTypeId;
}

interface BrowserSessionConfigurer {
  configure(nativeSession: Session): BrowserSession;
  dereference(browserSession: BrowserSession): Session;

  registerCustomProtocolPriviliges(): void;
}
const BrowserSessionConfigurer =
  makeServiceIdentifier<BrowserSessionConfigurer>("browser session configurer");
export { BrowserSessionConfigurer };
