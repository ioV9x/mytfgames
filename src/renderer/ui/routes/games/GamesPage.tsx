import "./GamesPage.scss";

import { Add as AddIcon } from "@carbon/icons-react";
import {
  Button,
  Pagination,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from "@carbon/react";
import { JSX, useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

import {
  GameOrderType,
  GameSearchResult,
  isGameOrderType,
  makeGameDisplayName,
} from "$ipc/main-renderer";
import { flipDirection, SortDirection } from "$pure-base/utils";
import { AppLink } from "$renderer/components";
import {
  LoadedGame,
  paginateGameIndex,
  selectLoadedGamesById,
} from "$renderer/dux/games";
import { useAppDispatch, useAppSelector } from "$renderer/dux/utils";
import { nearestPage, paginationSettingsFromQuery } from "$renderer/utils";

export default function GameIndexPage() {
  const dispatch = useAppDispatch();
  const [_, setLocation] = useLocation();
  const query = new URLSearchParams(useSearch());

  const { page, pageSize, sort } = paginationSettingsFromQuery(query, {
    page: 1,
    pageSize: 20,
    sort: SortDirection.Desc,
  });
  const orderType = orderFromQuery(query);
  const name = gameNameFromQuery(query);

  const numTotalGames = useAppSelector((state) => state.games.numGames);
  const [searchResult, setSearchResult] = useState<GameSearchResult>({
    selected: [],
    total: 0,
  });
  if (searchResult.total === 0 && page > 1) {
    const newQuery = new URLSearchParams(query);
    // Ideally, we'd set the page to the last page, but we don't have that info.
    // The backend doesn't provide the number of items if the search is empty
    // due to pagination running off the end of the list.
    newQuery.set("page", "1");
    setLocation(`?${newQuery.toString()}`, { replace: true });
  }
  useEffect(() => {
    const abortController = new AbortController();
    const paginationPromise = dispatch(
      paginateGameIndex({
        name,
        page,
        pageSize,
        orderType,
        orderDirection: sort,
      }),
    );
    void paginationPromise.then(async (req) => {
      if (
        abortController.signal.aborted ||
        req.meta.requestStatus !== "fulfilled"
      ) {
        return;
      }
      const searchResult = await paginationPromise.unwrap();
      setSearchResult(searchResult);
    });

    abortController.signal.addEventListener("abort", () =>
      paginationPromise.abort("Effect cancelled"),
    );
    return () => abortController.abort();
  }, [dispatch, name, page, pageSize, sort, orderType, numTotalGames]);

  const loadedGames = useAppSelector((state) =>
    selectLoadedGamesById(state, searchResult.selected),
  );

  return (
    <TableContainer title="Game Index" className="games__content">
      <TableToolbar>
        <TableToolbarContent>
          <TableToolbarSearch
            value={name ?? ""}
            onChange={(ev, _defaultValue) => {
              const newQuery = new URLSearchParams(query);
              const value = ev === "" ? ev : ev.target.value;
              if (value !== "") {
                newQuery.set("name", value);
              } else {
                newQuery.delete("name");
              }
              setLocation(`?${newQuery.toString()}`, {
                replace: true,
              });
            }}
            defaultExpanded
          />
          <Button
            renderIcon={AddIcon}
            iconDescription="Add Game"
            onClick={() => setLocation("/games/new")}
          >
            Add Game
          </Button>
        </TableToolbarContent>
      </TableToolbar>
      <GameTable
        items={loadedGames}
        totalItems={searchResult.total}
        page={page}
        pageSize={pageSize}
        pageSizes={[10, 20, 30, 40]}
        onPageChange={(changed) => {
          const newQuery = new URLSearchParams(query);
          const nextPage =
            pageSize === changed.pageSize
              ? changed.page
              : nearestPage({ page, pageSize }, changed.pageSize);
          newQuery.set("page", nextPage.toFixed(0));
          newQuery.set("pageSize", changed.pageSize.toFixed(0));
          setLocation(`?${newQuery.toString()}`);
        }}
        sortedBy={[orderType, sort]}
        onSortHeaderClicked={({ type, direction }) => {
          const newQuery = new URLSearchParams(query);
          newQuery.set("orderBy", type);
          newQuery.set("sort", direction);
          setLocation(`?${newQuery.toString()}`);
        }}
      />
    </TableContainer>
  );
}

function orderFromQuery(query: URLSearchParams) {
  const serializedOrder = query.get("orderBy");
  return isGameOrderType(serializedOrder)
    ? serializedOrder
    : GameOrderType.LastUpdate;
}
function gameNameFromQuery(query: URLSearchParams) {
  const name = query.get("name");
  return name != null && name !== "" ? name : undefined;
}

const GameTableHeaders: {
  key: React.Key;
  header: string;
  order?: GameOrderType;
  render(game: LoadedGame): JSX.Element | string;
}[] = [
  {
    key: "id",
    header: "ID",
    render(game) {
      return game.id;
    },
  },
  {
    key: "name",
    header: "Name",
    order: GameOrderType.Name,
    render(game) {
      const name = makeGameDisplayName(game) ?? <i>N/A</i>;
      return <AppLink href={`/games/${game.id}`}>{name}</AppLink>;
    },
  },
  {
    key: "numLikes",
    header: "Likes",
    render(game) {
      return game.listing?.numLikes.toString() ?? <i>N/A</i>;
    },
  },
  {
    key: "lastUpdateTimestamp",
    header: "Last Update",
    order: GameOrderType.LastUpdate,
    render(game) {
      return (
        game.listing?.lastUpdateTimestamp ??
        game.description?.lastChangeTimestamp ?? <i>N/A</i>
      );
    },
  },
];

interface GameTableProps {
  readonly items: readonly (LoadedGame | undefined)[];

  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageSizes: number[];
  readonly onPageChange: (data: { page: number; pageSize: number }) => void;

  readonly sortedBy: [GameOrderType, SortDirection];
  readonly onSortHeaderClicked: (data: {
    type: GameOrderType;
    direction: SortDirection;
  }) => void;
}
function GameTable({
  items,
  totalItems,
  page,
  pageSize,
  pageSizes,
  onPageChange,
  sortedBy,
  onSortHeaderClicked,
}: GameTableProps) {
  function bindSortHeaderClickedEventHandler(
    headerType: GameOrderType | undefined,
  ) {
    if (headerType == null) {
      return undefined;
    }
    const direction =
      headerType === sortedBy[0]
        ? flipDirection(sortedBy[1])
        : SortDirection.Asc;
    return onSortHeaderClicked.bind(undefined, { type: headerType, direction });
  }

  const pagination = (
    <Pagination
      totalItems={totalItems}
      page={page}
      pageSize={pageSize}
      pageSizes={pageSizes}
      onChange={onPageChange}
    />
  );

  return (
    <>
      {pagination}
      <Table isSortable={true}>
        <TableHead>
          <TableRow>
            {GameTableHeaders.map((header) => (
              <TableHeader
                key={header.key}
                isSortable={header.order != null}
                isSortHeader={header.order === sortedBy[0]}
                sortDirection={
                  header.order === sortedBy[0] ? sortedBy[1] : "NONE"
                }
                onClick={bindSortHeaderClickedEventHandler(header.order)}
              >
                {header.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((row, idx) => (
            <TableRow key={row?.id ?? idx}>
              {GameTableHeaders.map((cell) => (
                <TableCell key={cell.key}>
                  {row == null ? (
                    <SkeletonText key={cell.key} />
                  ) : (
                    cell.render(row)
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination}
    </>
  );
}
