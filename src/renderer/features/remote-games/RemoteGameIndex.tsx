import {
  Pagination,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useContext, useEffect, useState } from "react";

import { RemoteGameOrderType } from "$ipc/main-renderer";
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
  LoadedRemoteGame,
  paginateRemoteGameIndex,
  RemoteGame,
  RemoteGamePage,
  selectRemoteGamePage,
} from "./RemoteGamesSlice.mts";

export default function RemoteGameIndex() {
  const ipcContext = useContext(IpcContext);
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState<RemoteGamePage>({
    page: 1,
    pageSize: 20,
    orderType: RemoteGameOrderType.LastUpdate,
    orderDirection: SortDirection.Desc,
  });
  useEffect(
    () =>
      void dispatch(
        paginateRemoteGameIndex({
          ...currentPage,
          remoteGames: ipcContext!.remoteGames,
          force: false,
        }),
      ),
    [ipcContext, dispatch, currentPage],
  );

  const numItems = useAppSelector(
    (state) => state.remoteGames.order?.[currentPage.orderType]?.length ?? 0,
  );
  const remoteGames = useAppSelector((state) =>
    selectRemoteGamePage(state, currentPage),
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
    <>
      {currentPage.pageSize >= 20 && pagination}
      <RemoteGameTable
        remoteGames={remoteGames}
        sortedBy={[currentPage.orderType, currentPage.orderDirection]}
        onSortHeaderClicked={(orderType, orderDirection) => {
          setCurrentPage((old) => ({
            ...old,
            orderType,
            orderDirection,
          }));
        }}
      />
      {pagination}
    </>
  );
}

const headers: {
  key: keyof LoadedRemoteGame;
  header: string;
  order?: RemoteGameOrderType;
  render?(game: LoadedRemoteGame): JSX.Element | string;
}[] = [
  {
    key: "id",
    header: "ID",
  },
  {
    key: "name",
    header: "Name",
    order: RemoteGameOrderType.Name,
    render(game) {
      return <AppLink href={`/remote-games/${game.id}`}>{game.name}</AppLink>;
    },
  },
  {
    key: "lastUpdateTimestamp",
    header: "Last Update",
    order: RemoteGameOrderType.LastUpdate,
  },
  {
    key: "lastCrawlTimestamp",
    header: "Last Crawled",
    order: RemoteGameOrderType.LastCrawled,
  },
];

interface RemoteGameTableProps {
  readonly remoteGames: (RemoteGame | undefined)[];
  readonly sortedBy: [RemoteGameOrderType, SortDirection];
  readonly onSortHeaderClicked: (
    type: RemoteGameOrderType,
    direction: SortDirection,
  ) => void;
}
function RemoteGameTable({
  remoteGames,
  sortedBy: [sortType, sortDirection],
  onSortHeaderClicked,
}: RemoteGameTableProps) {
  function bindSortHeaderClickedEventHandler(
    headerType: RemoteGameOrderType | undefined,
  ) {
    if (headerType == null) {
      return undefined;
    }
    const direction =
      headerType === sortType
        ? flipDirection(sortDirection)
        : SortDirection.Asc;
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
        {remoteGames.map((row, idx) => (
          <TableRow key={row?.id ?? idx}>
            {headers.map((cell) => (
              <TableCell key={cell.key}>
                {row == null || row.type !== EntityRetrievalState.Loaded ? (
                  <SkeletonText key={cell.key} />
                ) : (
                  (cell.render?.(row) ?? row[cell.key])
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
