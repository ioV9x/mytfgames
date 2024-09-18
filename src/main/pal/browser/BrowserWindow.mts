import { makeServiceIdentifier } from "$node-base/utils";

export const BrowserWindowTypeId = Symbol("browser window");
export interface BrowserWindow {
  readonly type: typeof BrowserWindowTypeId;

  loadApp(): Promise<void>;
}
export function isBrowserWindow(v: object): v is BrowserWindow {
  return "type" in v && v.type === BrowserWindowTypeId;
}

interface BrowserWindowFactory {
  create(): BrowserWindow;
}
const BrowserWindowFactory = makeServiceIdentifier<BrowserWindowFactory>(
  "browser window factory",
);
export { BrowserWindowFactory };
