import { injectable } from "inversify";
import * as uuid from "uuid";

import { Game } from "$ipc/main-renderer";

import { GameInfoParser } from "./GameInfoParser.mjs";

@injectable()
export class DefaultGameInfoParser implements GameInfoParser {
  parseGameInfo(_gameMD: string): Promise<Game> {
    return Promise.resolve({
      id: uuid.v4(),
      description: null,
      listing: null,
    });
  }
}
