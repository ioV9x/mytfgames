import { load as cheerioLoad } from "cheerio";
import type { net } from "electron/main";
import { injectable } from "inversify";

import { LoginState, UcpApiService } from "./UcpApiService.mjs";

@injectable()
export class DefaultUcpApiService implements UcpApiService {
  #net: Pick<typeof net, "fetch">;
  constructor(_net: Pick<typeof net, "fetch">) {
    this.#net = _net;
  }

  async checkLoginState(cancel?: AbortSignal): Promise<LoginState> {
    cancel?.throwIfAborted();
    try {
      const abortController = new AbortController();
      if (cancel) {
        const onCancel = function onCancel(this: AbortSignal) {
          abortController.abort(this.reason);
        };
        cancel.addEventListener("abort", onCancel, { once: true });
        abortController.signal.addEventListener(
          "abort",
          () => {
            cancel.removeEventListener("abort", onCancel);
          },
          { once: true },
        );
      }
      const response = await this.#net.fetch(
        "https://tfgames.site/phpbb3/ucp.php?mode=login",
        {
          redirect: "manual",
          signal: abortController.signal,
        },
      );
      // ignore body
      abortController.abort();
      return response.redirected ? LoginState.LoggedIn : LoginState.NotLoggedIn;
    } catch (_err) {
      return LoginState.Unknown;
    }
  }

  async login(
    username: string,
    password: string,
    cancel?: AbortSignal,
  ): Promise<LoginState> {
    cancel?.throwIfAborted();

    const abortController = new AbortController();
    if (cancel) {
      const onCancel = function onCancel(this: AbortSignal) {
        abortController.abort(this.reason);
      };
      cancel.addEventListener("abort", onCancel, { once: true });
      abortController.signal.addEventListener(
        "abort",
        () => {
          cancel.removeEventListener("abort", onCancel);
        },
        { once: true },
      );
    }

    const loginPageResponse = await this.#net.fetch(
      "https://tfgames.site/phpbb3/ucp.php?mode=login",
      {
        redirect: "manual",
        signal: abortController.signal,
      },
    );
    if (loginPageResponse.redirected) {
      abortController.abort();
      return LoginState.LoggedIn;
    }
    if (!loginPageResponse.ok) {
      abortController.abort();
      throw new Error("Failed to fetch login page");
    }

    const $ = cheerioLoad(await loginPageResponse.text());
    const $form = $("form[id='login']");
    const loginData: Record<string, string> = {
      username,
      password,
      creation_time: $form.find("input[name='creation_time']").val() as string,
      form_token: $form.find("input[name='form_token']").val() as string,
      login: "Login",
      redirect: "/",
      autologin: "1",
    };

    const loginResponse = await this.#net.fetch(
      "https://tfgames.site/phpbb3/ucp.php?mode=login",
      {
        method: "POST",
        body: new URLSearchParams(loginData),
        redirect: "manual",
        signal: abortController.signal,
      },
    );
    abortController.abort();
    return loginResponse.redirected
      ? LoginState.LoggedIn
      : LoginState.NotLoggedIn;
  }
}
