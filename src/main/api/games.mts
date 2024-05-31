import { Cheerio, Element, load as cheerioLoad } from "cheerio";
import { net } from "electron/main";
import { injectable } from "inversify";

import { GameInfo } from "$ipc/main-renderer";
import { makeServiceIdentifier } from "$main/utils";

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

const GamesApi = makeServiceIdentifier<GamesApi>("games api");
interface GamesApi {
  getGames(): Promise<GameInfo[]>;
}
export { GamesApi };

@injectable()
export class GamesApiImpl {
  /**
   * Note that this call is not cached and _very_ expensive on the server side.
   */
  async getGames(): Promise<GameInfo[]> {
    const endpoint = "https://tfgames.site/index.php";
    const requestParams = new URLSearchParams();
    (
      [
        ["module", "search"],
        ["search", "1"],
        ["searchcontent", ""],
        // We need to specify at least one search parameter in order to get
        // any results at all. So I have excluded games via "author" using an
        // account that has not been online for a long time and whose games are
        // no longer available on the website.
        // I'm sorry "Dude" but you're the chosen one.
        // "3224" => "Dude"; 1 very old RAGS game; not online for over a decade
        ["exauthor[]", "3224"],
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
