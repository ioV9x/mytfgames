/// <reference types="vite/client" />
import "reflect-metadata/lite";

import { Container } from "inversify";

import { ArtifactsModule } from "./artifacts/artifacts.module.mjs";
import { PalIpcModule } from "./pal/ipc/ipc.module.mjs";
import { IpcServer } from "./pal/ipc/WorkerIpcServer.mjs";

const container = new Container();
container.load(
  // keep this list sorted
  ArtifactsModule,
  PalIpcModule,
);

const _ipcServer = container.get(IpcServer);
