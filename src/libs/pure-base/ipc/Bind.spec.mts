import "reflect-metadata/lite";

import { describe, expect, it } from "vitest";

import {
  ProcedureMetadata,
  remoteProcedure,
  ServiceMetadata,
} from "./Bind.mjs";
import { makeRemoteProcedureDescriptor } from "./RemoteProcedures/index.mjs";
import { makeRemoteServiceDescriptor } from "./RemoteServices/index.mjs";

describe("ipc/core/Bind", () => {
  it("should bind a remote procedure", () => {
    const serviceDescriptor = makeRemoteServiceDescriptor("x:base", {
      doX: makeRemoteProcedureDescriptor<[string, number], string>(),
    });

    class ServiceImpl {
      @remoteProcedure(serviceDescriptor, "doX")
      doesX(a: string, b: number) {
        return `${a}${b.toString()}`;
      }
    }
    const impl = new ServiceImpl();

    expect(Reflect.getMetadata(ServiceMetadata, impl)).toEqual(["doesX"]);
    expect(Reflect.getMetadata(ProcedureMetadata, impl, "doesX")).toEqual({
      serviceId: "x:base",
      procId: "doX",
      options: {},
    });
  });
});
