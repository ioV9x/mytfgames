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

import { GameOrderType } from "$ipc/main-renderer";
import { AppLink } from "$renderer/components";

import { IpcContext } from "../../ipc/IpcContext.mjs";
import { useAppDispatch, useAppSelector } from "../../utils/redux.mts";
import {
  EntityRetrievalState,
  LoadedGameInfo,
  loadGameList,
  selectPaginatedGameList,
} from "./gamesSlice.mts";

export default function Games() {
  const ipcContext = useContext(IpcContext);
  const store = useAppDispatch();
  const [paginationState, setPaginationState] = useState({
    page: 1,
    pageSize: 20,
    orderType: GameOrderType.LastUpdate,
  });

  const numItems = useAppSelector((state) =>
    Math.max(0, ...Object.values(state.games.order).map((v) => v.length)),
  );
  const games = useAppSelector((state) =>
    selectPaginatedGameList(state, paginationState),
  );

  const pagination = (
    <Pagination
      totalItems={numItems}
      page={paginationState.page}
      pageSize={paginationState.pageSize}
      pageSizes={[10, 20, 30, 40]}
      onChange={({ page, pageSize }) => {
        page =
          paginationState.pageSize === pageSize
            ? page
            : Math.max(
                1,
                Math.floor(
                  ((paginationState.page - 1) * paginationState.pageSize) /
                    pageSize +
                    1,
                ),
              );
        setPaginationState((old) => ({ ...old, page, pageSize }));
      }}
    />
  );
  useEffect(() => {
    store(
      loadGameList({
        ...paginationState,
        gameInfo: ipcContext!.gameInfo,
        force: false,
      }),
    ).catch((err: unknown) => {
      console.error(err);
      // FIXME: navigate to error page
    });
  }, [ipcContext, store, paginationState]);

  const headers: {
    key: keyof LoadedGameInfo;
    header: string;
    order?: GameOrderType;
    render?(game: LoadedGameInfo): JSX.Element | string;
  }[] = [
    {
      key: "id",
      header: "ID",
    },
    {
      key: "tfgamesId",
      header: "TFGames ID",
    },
    {
      key: "name",
      header: "Name",
      order: GameOrderType.Name,
      render(game) {
        return <AppLink href={`/games/${game.id}`}>{game.name}</AppLink>;
      },
    },
    {
      key: "lastUpdate",
      header: "Last Update",
      order: GameOrderType.LastUpdate,
    },
  ];

  return (
    <>
      {pagination}
      <Table isSortable={true}>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableHeader
                key={header.key}
                isSortable={header.order != null}
                isSortHeader={header.order === paginationState.orderType}
              >
                {header.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {games.map((row, idx) => (
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
      {pagination}
    </>
  );
}
