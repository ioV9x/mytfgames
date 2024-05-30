import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { net, protocol, type Session } from "electron/main";
import { inject, injectable } from "inversify";

import { AppConfiguration } from "$main/configuration";

import {
  type BrowserSession,
  type BrowserSessionConfigurer,
  BrowserSessionTypeId,
} from "./BrowserSession.mjs";

type ProtocolHandler = Parameters<(typeof protocol)["handle"]>[1];

const sessionWrappers = new WeakMap<Session, ElectronBrowserSession>();

@injectable()
export class ElectronBrowserSessionConfigurer
  implements BrowserSessionConfigurer
{
  readonly rendererAppPath: string;

  constructor(
    @inject(AppConfiguration) private readonly configuration: AppConfiguration,
  ) {
    this.rendererAppPath = this.configuration.root.paths.renderer_app;
  }

  registerCustomProtocolPriviliges(): void {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: "app",
        privileges: {
          standard: true,
          codeCache: true,
          secure: true,
          stream: true,
          supportFetchAPI: true,
        },
      },
    ]);
  }

  configure(nativeSession: Session): BrowserSession {
    let browserSession = sessionWrappers.get(nativeSession);
    if (browserSession == null) {
      browserSession = new ElectronBrowserSession(nativeSession);
      sessionWrappers.set(nativeSession, browserSession);
      this.setupProtocols(nativeSession);
    }
    return browserSession;
  }

  dereference(browserSession: BrowserSession): Electron.Session {
    if (!(browserSession instanceof ElectronBrowserSession)) {
      throw new Error(
        "Can only dereference browser session objects created by this",
      );
    }
    return browserSession.handle;
  }

  setupProtocols(nativeSession: Session): void {
    nativeSession.protocol.handle("app", this.appProtocol);
  }

  appProtocol: ProtocolHandler = async (request) => {
    const url = new URL(request.url);
    if (url.protocol !== "app:" || url.host !== "renderer.invalid") {
      return new Response(null, {
        status: 400,
        statusText: "Invalid app origin",
      });
    }
    const resourcePath = path.resolve(
      this.rendererAppPath,
      path.posix.join(".", url.pathname),
    );
    if (!resourcePath.startsWith(this.rendererAppPath)) {
      return new Response(null, {
        status: 400,
        statusText: "Invalid app path",
      });
    }
    const stat = fs.statSync(resourcePath, { throwIfNoEntry: false });
    const resourceUrl = pathToFileURL(
      stat?.isDirectory()
        ? path.join(resourcePath, "index.html")
        : resourcePath,
    );
    return net.fetch(resourceUrl.href);
  };
}

class ElectronBrowserSession implements BrowserSession {
  get type(): typeof BrowserSessionTypeId {
    return BrowserSessionTypeId;
  }

  constructor(readonly handle: Session) {}
}
