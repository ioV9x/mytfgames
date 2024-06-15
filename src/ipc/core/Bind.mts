/// <reference types="reflect-metadata/lite" />

import { MessageTransport } from "./Messages/index.mjs";
import {
  RemoteProcedureDescriptor,
  RemoteProcedureOptions,
  RemoteProcedureServer,
} from "./RemoteProcedures/index.mjs";
import {
  RemoteServiceId,
  RemoteServiceShape,
} from "./RemoteServices/index.mjs";

type ProcedureImplementation<TArgs extends unknown[], TReturn> = (
  ...args: [...TArgs, source: MessageTransport]
) => Promise<TReturn> | TReturn;

type RemoteProcedureKeys<TShape extends RemoteServiceShape> = {
  [K in keyof TShape]: K extends string
    ? TShape[K] extends RemoteProcedureDescriptor<infer _TArgs, infer _TReturn>
      ? K
      : never
    : never;
}[keyof TShape];

type ToProcedureImplementation<
  TShape extends RemoteServiceShape,
  K extends keyof TShape,
> =
  TShape[K] extends RemoteProcedureDescriptor<infer TArgs, infer TReturn>
    ? ProcedureImplementation<TArgs, TReturn>
    : never;

export const ServiceMetadata = Symbol("remote-service");
export type ServiceMetadata = string[];
export const ProcedureMetadata = Symbol("remote-procedure");
export interface ProcedureMetadata {
  serviceId: string;
  procId: string;
  options: RemoteProcedureOptions;
}

export function remoteProcedure<
  TShape extends RemoteServiceShape,
  KS extends RemoteProcedureKeys<TShape>,
>(proto: TShape, procId: KS) {
  type BoundProcedureImplementation = ToProcedureImplementation<TShape, KS>;

  return function brpi<
    T extends Record<K, BoundProcedureImplementation>,
    K extends string,
  >(target: T, key: K) {
    if (Reflect.hasMetadata(ProcedureMetadata, target, key)) {
      throw new Error(
        `Duplicate remote procedure binding for ${key} (as ${proto[RemoteServiceId]}:${procId.toString()})`,
      );
    }

    let serviceMetadata = Reflect.getMetadata(ServiceMetadata, target) as
      | ServiceMetadata
      | undefined;
    if (serviceMetadata == null) {
      serviceMetadata = [];
      Reflect.defineMetadata(ServiceMetadata, serviceMetadata, target);
    }
    serviceMetadata.push(key);

    const { [RemoteServiceId]: serviceId, [procId]: descriptor } = proto;
    const { [RemoteProcedureOptions]: options } =
      descriptor as RemoteProcedureDescriptor<unknown[], unknown>;
    Reflect.defineMetadata(
      ProcedureMetadata,
      { serviceId, procId, options } satisfies ProcedureMetadata,
      target,
      key,
    );
  };
}

export function registerIpcServices(
  remoteProcedureServer: RemoteProcedureServer,
  ipcServiceProvider: Record<string, unknown>,
) {
  const serviceMetadata = Reflect.getMetadata(
    ServiceMetadata,
    ipcServiceProvider,
  ) as ServiceMetadata | undefined;
  if (serviceMetadata == null) {
    throw new Error("No ipc services found");
  }

  for (const key of serviceMetadata) {
    const procedureMetadata = Reflect.getMetadata(
      ProcedureMetadata,
      ipcServiceProvider,
      key,
    ) as ProcedureMetadata | undefined;
    if (procedureMetadata == null) {
      // this can only happen if someone messes with the metadata
      throw new Error("No remote procedure found");
    }
    if (
      !(key in ipcServiceProvider) ||
      typeof ipcServiceProvider[key] !== "function"
    ) {
      throw new Error("No remote procedure implementation found");
    }

    const { serviceId, procId, options } = procedureMetadata;
    const procedure = ipcServiceProvider[key] as ProcedureImplementation<
      unknown[],
      unknown
    >;
    remoteProcedureServer.registerProcedure(
      serviceId,
      procId,
      options,
      procedure.bind(ipcServiceProvider),
    );
  }
}
