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
} from "@carbon/react";
import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

import { GameOrderType, isGameOrderType } from "$ipc/main-renderer";
import { AppLink } from "$renderer/components";
import { useIpc } from "$renderer/ipc";
import {
  EntityRetrievalState,
  flipDirection,
  nearestPage,
  paginationSettingsFromQuery,
  SortDirection,
  useAppDispatch,
  useAppSelector,
} from "$renderer/utils";

import {
  LoadedGame,
  paginateGameIndex,
  selectGamePage,
} from "./GamesSlice.mts";

export default function GameIndexPage() {
  const ipcContext = useIpc();
  const dispatch = useAppDispatch();
  const [_, setLocation] = useLocation();
  const query = new URLSearchParams(useSearch());

  const { page, pageSize, sort } = paginationSettingsFromQuery(query);
  const orderType = orderFromQuery(query);

  useEffect(() => {
    void dispatch(
      paginateGameIndex({
        page,
        pageSize,
        orderType,
        orderDirection: sort,
        games: ipcContext.games,
      }),
    );
  }, [ipcContext, dispatch, page, pageSize, sort, orderType]);

  const numItems = useAppSelector(
    (state) => state.games.order?.[orderType].length ?? 0,
  );
  const games = useAppSelector((state) =>
    selectGamePage(state, {
      page,
      pageSize,
      orderType,
      orderDirection: sort,
    }),
  );
  const loadedGames = games.map((game) =>
    game?.type === EntityRetrievalState.Loaded ? game : undefined,
  );

  return (
    <TableContainer title="Game Index">
      <TableToolbar>
        <TableToolbarContent>
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
        totalItems={numItems}
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
      let name: JSX.Element | string | undefined = game.description?.name;
      if (name == null) {
        name = game.listing?.name ?? <i>N/A</i>;
      } else if (game.listing?.name != null) {
        name = `${name} (${game.listing.name})`;
      }
      return <AppLink href={`/games/${game.id}`}>{name}</AppLink>;
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
  items: (LoadedGame | undefined)[];

  totalItems: number;
  page: number;
  pageSize: number;
  pageSizes: number[];
  onPageChange(data: { page: number; pageSize: number }): void;

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