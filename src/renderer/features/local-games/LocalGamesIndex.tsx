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
import { useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";

import { LocalGameOrderType } from "$ipc/main-renderer";
import { AppLink } from "$renderer/components";
import {
  EntityRetrievalState,
  flipDirection,
  nearestPage,
  SortDirection,
  useAppDispatch,
  useAppSelector,
} from "$renderer/utils";

import { IpcContext } from "../../ipc/IpcContext.mjs";
import {
  LoadedLocalGame,
  LocalGame,
  LocalGamePage,
  paginateLocalGameIndex,
  selectLocalGamePage,
} from "./LocalGamesSlice.mts";

export default function LocalGameIndex() {
  const ipcContext = useContext(IpcContext);
  const [_, setLocation] = useLocation();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState<LocalGamePage>({
    page: 1,
    pageSize: 20,
    orderType: LocalGameOrderType.Name,
    orderDirection: "ASC",
  });
  useEffect(
    () =>
      void dispatch(
        paginateLocalGameIndex({
          ...currentPage,
          localGames: ipcContext!.localGames,
          force: false,
        }),
      ),
    [ipcContext, dispatch, currentPage],
  );

  const numItems = useAppSelector(
    (state) => state.localGames.order?.[currentPage.orderType]?.length ?? 0,
  );
  const localGames = useAppSelector((state) =>
    selectLocalGamePage(state, currentPage),
  );

  const pagination = (
    <Pagination
      totalItems={numItems}
      page={currentPage.page}
      pageSize={currentPage.pageSize}
      pageSizes={[10, 20, 30, 40]}
      onChange={({ page, pageSize }) =>
        setCurrentPage((old) => ({
          ...old,
          page:
            currentPage.pageSize === pageSize
              ? page
              : nearestPage(currentPage, pageSize),
          pageSize,
        }))
      }
    />
  );

  return (
    <TableContainer title="Game Library">
      <TableToolbar>
        <TableToolbarContent>
          <Button
            renderIcon={AddIcon}
            iconDescription="Add Game"
            onClick={() => setLocation("/local-games/new")}
          >
            Add Game
          </Button>
        </TableToolbarContent>
      </TableToolbar>
      {numItems > currentPage.pageSize &&
        currentPage.pageSize >= 20 &&
        pagination}
      <LocalGameTable
        localGames={localGames}
        sortedBy={[currentPage.orderType, currentPage.orderDirection]}
        onSortHeaderClicked={(orderType, orderDirection) => {
          setCurrentPage((old) => ({
            ...old,
            orderType,
            orderDirection,
          }));
        }}
      />
      {numItems > currentPage.pageSize && pagination}
    </TableContainer>
  );
}

const headers: {
  key: keyof LoadedLocalGame;
  header: string;
  order?: LocalGameOrderType;
  render?(game: LoadedLocalGame): JSX.Element | string;
}[] = [
  {
    key: "id",
    header: "ID",
  },
  {
    key: "name",
    header: "Name",
    order: LocalGameOrderType.Name,
    render(game) {
      return <AppLink href={`/local-games/${game.id}`}>{game.name}</AppLink>;
    },
  },
];

interface LocalGameTableProps {
  readonly localGames: (LocalGame | undefined)[];
  readonly sortedBy: [LocalGameOrderType, SortDirection];
  readonly onSortHeaderClicked: (
    type: LocalGameOrderType,
    direction: SortDirection,
  ) => void;
}
function LocalGameTable({
  localGames,
  sortedBy: [sortType, sortDirection],
  onSortHeaderClicked,
}: LocalGameTableProps) {
  function bindSortHeaderClickedEventHandler(
    headerType: LocalGameOrderType | undefined,
  ) {
    if (headerType == null) {
      return undefined;
    }
    const direction =
      headerType === sortType ? flipDirection(sortDirection) : "ASC";
    return onSortHeaderClicked.bind(undefined, headerType, direction);
  }

  return (
    <Table isSortable={true}>
      <TableHead>
        <TableRow>
          {headers.map((header) => (
            <TableHeader
              key={header.key}
              isSortable={header.order != null}
              isSortHeader={header.order === sortType}
              sortDirection={header.order === sortType ? sortDirection : "NONE"}
              onClick={bindSortHeaderClickedEventHandler(header.order)}
            >
              {header.header}
            </TableHeader>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {localGames.map((row, idx) => (
          <TableRow key={row?.id ?? idx}>
            {headers.map((cell) => (
              <TableCell key={cell.key}>
                {row == null || row.type !== EntityRetrievalState.Loaded ? (
                  <SkeletonText key={cell.key} />
                ) : (
                  cell.render?.(row) ?? row[cell.key]
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
