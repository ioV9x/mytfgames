import * as fs from "node:fs";
import * as path from "node:path";

import { net } from "electron/main";
import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

import { DefaultUcpApiService } from "./DefaultUcpApiService.mjs";
import { LoginState } from "./UcpApiService.mjs";

describe("DefaultUcpApiService", () => {
  let netMock: Mocked<Pick<typeof net, "fetch">>;

  beforeEach(() => {
    netMock = {
      fetch: vi.fn(),
    };
  });

  it("should be instantiatable", () => {
    const subject = new DefaultUcpApiService(netMock);
    expect(subject).toBeInstanceOf(DefaultUcpApiService);
  });

  describe("instance", () => {
    let subject: DefaultUcpApiService;
    beforeEach(() => {
      subject = new DefaultUcpApiService(netMock);
    });

    it("should check login state", async () => {
      netMock.fetch.mockResolvedValueOnce({
        headers: new Headers(),
        ok: false,
        redirected: true,
        status: 0,
        statusText: "",
        type: "opaqueredirect",
        url: "",
        clone: function (): Response {
          throw new Error("Function not implemented.");
        },
        body: null,
        bodyUsed: false,
      } as Response);

      const result = await subject.checkLoginState();

      // ensure that the fetch call is correct (otherwise the test is useless)
      expect(netMock.fetch.mock.calls).toMatchSnapshot();
      expect(result).toBe(LoginState.LoggedIn);
    });

    it("should correctly fill out the login form", async () => {
      const responseBody = fs.readFileSync(
        path.join(import.meta.dirname, "test/ucp-login.html"),
        "utf8",
      );

      netMock.fetch.mockResolvedValueOnce(new Response(responseBody));
      netMock.fetch.mockResolvedValueOnce({
        headers: new Headers(),
        ok: false,
        redirected: true,
        status: 0,
        statusText: "",
        type: "opaqueredirect",
        url: "",
        clone: function (): Response {
          throw new Error("Function not implemented.");
        },
        body: null,
        bodyUsed: false,
      } as Response);

      const result = await subject.login("username", "password");

      // ensure that the fetch call is correct (otherwise the test is useless)
      // the second fetch snapshot body contains the url search params which
      // tests that the login form has been correctly scraped
      expect(netMock.fetch.mock.calls).toMatchSnapshot();
      expect(result).toBe(LoginState.LoggedIn);
    });
  });
});
