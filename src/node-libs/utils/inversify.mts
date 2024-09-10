import { interfaces } from "inversify";

export function makeServiceIdentifier<T extends object>(
  debugNameOrSymbol: string | symbol,
): interfaces.ServiceIdentifier<T> {
  return typeof debugNameOrSymbol === "symbol"
    ? debugNameOrSymbol
    : Symbol(debugNameOrSymbol);
}
