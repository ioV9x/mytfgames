import { inject, injectable } from "inversify";
import { Temporal } from "temporal-polyfill";

import { Job, JobSchedule } from "$main/pal";

import { GameDataService } from "./GameDataService.mjs";

@injectable()
export class GameListingSyncSchedule implements JobSchedule {
  constructor(
    @inject(GameDataService) private readonly gameInfo: GameDataService,
  ) {}
  readonly scheduleName = "game-listing-sync";
  readonly scheduleCheckInterval = Temporal.Duration.from({ minutes: 15 });
  readonly runOnStart = true;
  readonly maxJobConcurrency = 8;

  async checkSchedule(): Promise<Job[]> {
    const needUpdate = await this.gameInfo.refreshIndex();
    return needUpdate.map(([, id]) => ({
      id: `game-listing-sync-${id}`,
      run: async () => {
        await this.gameInfo.downloadGameInfo(id);
      },
    }));
  }
}
