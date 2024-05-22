export const RemoteProcedureOptions = Symbol("remote-procedure-options");
export type RemoteProcedureOptions = object;

export type RemoteProcedureDescriptor<TArgs extends unknown[], TReturn> = {
  [RemoteProcedureOptions]: RemoteProcedureOptions;
} & ((...args: TArgs) => Promise<TReturn>);

export function makeRemoteProcedureDescriptor<
  TArgs extends unknown[],
  TReturn,
>(): RemoteProcedureDescriptor<TArgs, TReturn> {
  function rpcStub(): Promise<never> {
    return Promise.reject(new Error("stub function called"));
  }
  return Object.assign(rpcStub, {
    [RemoteProcedureOptions]: {},
  });
}
