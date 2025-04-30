import { BindToFluentSyntax, ServiceIdentifier } from "inversify";

export function makeServiceIdentifier<T extends object>(
  debugNameOrSymbol: string | symbol,
): ServiceIdentifier<T> {
  return typeof debugNameOrSymbol === "symbol"
    ? debugNameOrSymbol
    : Symbol(debugNameOrSymbol);
}

export type BindFn = <T>(
  this: void,
  serviceIdentifier: ServiceIdentifier<T>,
) => BindToFluentSyntax<T>;
