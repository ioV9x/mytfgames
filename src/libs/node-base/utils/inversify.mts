import { ServiceIdentifier } from "inversify";

export function makeServiceIdentifier<T extends object>(
  debugNameOrSymbol: string | symbol,
): ServiceIdentifier<T> {
  return typeof debugNameOrSymbol === "symbol"
    ? debugNameOrSymbol
    : Symbol(debugNameOrSymbol);
}
