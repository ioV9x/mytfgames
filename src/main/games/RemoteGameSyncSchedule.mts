import { inject, injectable } from "inversify";
import { Temporal } from "temporal-polyfill";

import { Job, JobSchedule } from "$main/pal";

import { GameInfoService } from "./GameInfoService.mjs";

@injectable()
export class RemoteGameSyncSchedule implements JobSchedule {
  constructor(
    @inject(GameInfoService) private readonly gameInfo: GameInfoService,
  ) {}
  readonly scheduleName = "remote-game-sync";
  readonly scheduleCheckInterval = Temporal.Duration.from({ minutes: 15 });
  readonly runOnStart = true;
  readonly maxJobConcurrency = 8;

  async checkSchedule(): Promise<Job[]> {
    const needUpdate = await this.gameInfo.refreshIndex();
    return needUpdate.map((id) => ({
      id: `remote-game-info-sync-${id}`,
      run: async () => {
        await this.gameInfo.downloadGameInfo(id);
      },
    }));
  }
}
