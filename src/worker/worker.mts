/// <reference types="vite/client" />
import "reflect-metadata/lite";

import { workerData } from "node:worker_threads";

import { Container } from "inversify";

import { AppConfigurationTree } from "$node-base/configuration";
import { BaseConfigurationModule } from "$node-base/configuration/configuration.module.mjs";
import { WorkerData } from "$node-base/utils";

import { ArtifactsModule } from "./artifacts/artifacts.module.mjs";
import { PalIpcModule } from "./pal/ipc/ipc.module.mjs";
import { IpcServer } from "./pal/ipc/WorkerIpcServer.mjs";

const container = new Container();
container.load(
  // keep this list sorted
  ArtifactsModule,
  BaseConfigurationModule,
  PalIpcModule,
);

container
  .bind(AppConfigurationTree)
  .toConstantValue((workerData as WorkerData).config);

const _ipcServer = container.get(IpcServer);
