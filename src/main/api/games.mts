import { Cheerio, CheerioAPI, Element, load as cheerioLoad } from "cheerio";
import { ElementType } from "domelementtype";
import { net } from "electron/main";
import { injectable } from "inversify";
import { Temporal } from "temporal-polyfill";

import { makeServiceIdentifier } from "$main/utils";

const idRegex = /&id=(\d+)/;

export interface RemoteIndexGameInfo {
  /**
   * remote id of the game used by tfgames.site
   */
  id: number;
  /**
   * Name of the game.
   */
  name: string;
  /**
   * Last update date of the game in ISO 8601 format.
   */
  lastUpdate: string;
}

export interface RemoteTransformationTheme {
  id: number;
  name: string;
  acronym: string;
}
export interface RemoteVersionInfo {
  version: string;
  downloads: RemoteVersionDownload[];
}
export interface RemoteVersionDownload {
  name: string;
  link: string;
  note: string;
}
export interface RemoteAuthorInfo {
  id: number;
  name: string;
}
export interface RemoteGameDetails {
  id: number;
  /**
   * Release date of the game in ISO 8601 format.
   */
  releaseDate: string;
  /**
   * Transformation themes of the game.
   */
  transformationThemes: RemoteTransformationTheme[];

  authors: RemoteAuthorInfo[];
  versions: RemoteVersionInfo[];
}

type PropExtractor = (
  $td: Cheerio<Element>,
) => Partial<RemoteIndexGameInfo> | undefined;
const propExtractors = Object.assign(
  Object.create(null) as Record<string, PropExtractor | undefined>,
  {
    Name: ($td: Cheerio<Element>) =>
      ({
        id: Number.parseInt(
          idRegex.exec($td.find("a").get(0)!.attribs["href"] ?? "")![1]!,
        ),
        name: $td.text().trim(),
      }) satisfies Partial<RemoteIndexGameInfo>,
    "Last Update": ($td: Cheerio<Element>) =>
      ({
        lastUpdate: $td.text().trim(),
      }) satisfies Partial<RemoteIndexGameInfo>,
  },
);

const dateFormatVariants = [
  [/^2\d\d\d-\d\d-\d\d$/, (match: RegExpMatchArray) => match[0]!],
  [
    /^(\d?\d)\/(\d?\d)\/(2\d\d\d)$/,
    (match: RegExpMatchArray) =>
      `${match[3]!}-${match[1]!.padStart(2, "0")}-${match[2]!.padStart(2, "0")}`,
  ],
  [
    /^(\d?\d)-(\d?\d)-(2\d\d\d)$/,
    (match: RegExpMatchArray) =>
      `${match[3]!}-${match[2]!.padStart(2, "0")}-${match[1]!.padStart(2, "0")}`,
  ],
] as const;
function adaptDate(input: string): string {
  for (const [regex, replacement] of dateFormatVariants) {
    const match = regex.exec(input);
    if (match) {
      return replacement(match);
    }
  }
  throw new Error(`Could not adapt date: ${input}`);
}

const gameInfoExtractors = Object.assign(
  Object.create(null) as Record<string, PropExtractor | undefined>,
  {
    "Release Date": ($itemR: Cheerio<Element>) => {
      return {
        releaseDate: adaptDate($itemR.text().trim()),
      } satisfies Partial<RemoteGameDetails>;
    },
    "TF Themes": ($itemR: Cheerio<Element>) => {
      const $themes = $itemR.find("a");
      return {
        transformationThemes: $themes
          .map((_, a) => {
            const id = new URLSearchParams(a.attribs["href"]).get(
              "transformation",
            );
            const name = a.attribs["title"];
            const acronym =
              a.firstChild?.type === ElementType.Text
                ? a.firstChild.data
                : undefined;
            if (!id || !name || !acronym) {
              return;
            }
            return { id: Number.parseInt(id), name, acronym };
          })
          .get(),
      } satisfies Partial<RemoteGameDetails>;
    },
  },
);

const GamesApi = makeServiceIdentifier<GamesApi>("games api");
interface GamesApi {
  getGames(): Promise<RemoteIndexGameInfo[]>;
}
export { GamesApi };

const viewgameBodySelector =
  "body > div.bodyplaceholder > div.bodyplaceholder_left";
const viewgameMetaInfoSelector = `${viewgameBodySelector} > div.viewgamesidecontainer`;
const viewgameContentSelector = `${viewgameBodySelector} > div.viewgamecontentcontainer`;

@injectable()
export class GamesApiImpl {
  /**
   * Note that this call is not cached and _very_ expensive on the server side.
   */
  async getGames(): Promise<RemoteIndexGameInfo[]> {
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

  parseGameList(response: string): RemoteIndexGameInfo[] {
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
        return Object.assign({}, ...partials) as RemoteIndexGameInfo;
      })
      .get();

    return games;
  }

  async getGameDetails(id: number): Promise<RemoteGameDetails> {
    const endpoint = new URL("https://tfgames.site/index.php?module=viewgame");
    endpoint.searchParams.set("id", id.toString());

    const response = await net.fetch(endpoint.href, {
      method: "GET",
      headers: {},
    });

    return this.parseGameDetails(id, await response.text());
  }

  parseGameDetails(id: number, response: string): RemoteGameDetails {
    const $ = cheerioLoad(response);

    const $generalInfo = $(
      `${viewgameMetaInfoSelector} div.viewgameinfocontainer:not([id]) > div.viewgameinfo`,
    );
    const generalInfoParts = $generalInfo
      .map((_, el) => {
        const $el = $(el);
        const partId = $el.find("div.viewgameitemleft").text().trim();
        const $itemR = $el.find("div.viewgameitemright");
        const extractor = gameInfoExtractors[partId];
        if (!extractor) {
          return;
        }
        return extractor($itemR);
      })
      .get();

    const versions = this.parseVersionInfo($);

    const authors = $(
      `${viewgameContentSelector} > div.viewgamecontentauthor > a`,
    )
      .map((_, authorLinkNode) => {
        const profileUrlText = authorLinkNode.attribs["href"];
        const nameNode = authorLinkNode.firstChild;
        if (!profileUrlText || nameNode?.type !== ElementType.Text) {
          return;
        }
        const profileUrl = new URL(profileUrlText);
        const profileId = profileUrl.searchParams.get("u");
        if (!profileId) {
          return;
        }

        return {
          id: Number.parseInt(profileId),
          name: nameNode.data,
        } as RemoteAuthorInfo;
      })
      .get();

    // TODO: validate that all props are defined
    return Object.assign(
      { id, authors, versions } satisfies Partial<RemoteGameDetails>,
      ...generalInfoParts,
    ) as RemoteGameDetails;
  }

  parseVersionInfo($: CheerioAPI): RemoteVersionInfo[] {
    const versions: RemoteVersionInfo[] = [];
    let versionProto: RemoteVersionInfo | undefined = undefined;
    const versionInfoElements = $(`${viewgameMetaInfoSelector} div#downloads`)
      .children(":not(br)")
      .get();
    for (const el of versionInfoElements) {
      if (el.type !== ElementType.Tag) {
        continue;
      }
      if (el.tagName === "center") {
        const child = el.firstChild;
        if (child?.type !== ElementType.Text) {
          continue;
        }
        if (versionProto) {
          versions.push(versionProto);
        }
        const displayPrefix = "Version: ";
        const versionText = child.data.trim();
        const version = versionText.startsWith(displayPrefix)
          ? versionText.slice(displayPrefix.length)
          : versionText;
        versionProto = { version, downloads: [] };
        continue;
      } else if (versionProto == null) {
        continue;
      } else if (
        el.tagName === "div" &&
        el.attribs["class"] === "dlcontainer"
      ) {
        const $el = $(el);
        const linkNodes = $el.find("div.dltext > a").get();
        const noteNodes = $el.find("div.dlnotes > img").get();
        if (linkNodes.length !== 1 || noteNodes.length !== 1) {
          continue;
        }
        const linkTextNode = linkNodes[0]!.firstChild;
        if (linkTextNode?.type !== ElementType.Text) {
          continue;
        }
        const name = linkTextNode.data.trim();
        const link = linkNodes[0]!.attribs["href"];
        const note = noteNodes[0]!.attribs["title"];
        if (!link || !note) {
          continue;
        }

        versionProto.downloads.push({ name, link, note });
      }
    }
    if (versionProto) {
      versions.push(versionProto);
    }

    return versions;
  }
}
