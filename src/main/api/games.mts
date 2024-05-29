import { Cheerio, Element, load as cheerioLoad } from "cheerio";
import { net } from "electron/main";
import { injectable } from "inversify";

import { remoteProcedure } from "$ipc/core";
import { GameInfo, GameInfoService } from "$ipc/main-renderer";

const idRegex = /&id=(\d+)/;

type PropExtractor = ($td: Cheerio<Element>) => Partial<GameInfo> | undefined;
const propExtractors = Object.assign(
  Object.create(null) as Record<string, PropExtractor | undefined>,
  {
    Name: ($td: Cheerio<Element>) => ({
      rid: idRegex.exec($td.find("a").get(0)!.attribs["href"] ?? "")![1]!,
      name: $td.text().trim(),
    }),
    "Last Update": ($td: Cheerio<Element>) => ({
      lastUpdate: $td.text().trim(),
    }),
  },
);

@injectable()
export class GamesApi {
  @remoteProcedure(GameInfoService, "getGames")
  async getGames(): Promise<GameInfo[]> {
    const endpoint = "https://tfgames.site/index.php";
    const requestParams = new URLSearchParams();
    (
      [
        ["module", "search"],
        ["search", "1"],
        ["searchcontent", ""],
        ["multimedia[]", "32"], // "32" == Voice
        ["likesmin", "0"],
        ["likesmax", "0"],
      ] as const
    ).forEach(([key, value]) => requestParams.set(key, value));

    const response = await net.fetch(endpoint, {
      method: "POST",
      headers: {},
      body: requestParams,
    });

    return this.parseGameList(await response.text());
  }

  parseGameList(response: string): GameInfo[] {
    const $ = cheerioLoad(response);
    const $searchresults = $("div.searchresultcontainer > table");

    const $headers = $searchresults.find("thead > tr > th");
    // double map as cheerio removes undefined / null values
    const columnPropExtractor = $headers
      .map((_, th) => $(th).text().trim())
      .get()
      .map((headerText) => propExtractors[headerText]);

    const games = $searchresults
      .find("tbody > tr")
      .map((_, tr) => {
        const $tds = $(tr).find("td");
        const partials = $tds
          .map((i, td) => columnPropExtractor[i]?.($(td)))
          .get();
        // TODO: validate that all props are defined
        return Object.assign({}, ...partials) as GameInfo;
      })
      .get();

    return games;
  }
}
