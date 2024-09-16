import { net } from "electron/main";
import { injectable } from "inversify";

import { UserService } from "$ipc/main-renderer";
import { remoteProcedure } from "$pure-base/ipc";

@injectable()
export class AccountService {
  @remoteProcedure(UserService, "isLoggedIn")
  async isLoggedIn(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const response = await net.fetch(
        "https://tfgames.site/phpbb3/ucp.php?mode=login",
        {
          redirect: "manual",
          signal: controller.signal,
        },
      );
      controller.abort();
      return response.redirected;
    } catch (_err) {
      return false;
    }
  }
}
