import type services from "$ipc/main-renderer";

// add a distinct non-extensible name for the thunk extra argument in order to
// reduce the load on the type checker.
// This lives in a separate file in order to allow easy mocking of the services
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IThunkExtra = {
  readonly services: typeof services;
};
export const thunkExtra: IThunkExtra = { services: undefined! };
