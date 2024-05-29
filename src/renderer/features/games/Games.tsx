import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useContext, useEffect } from "react";

import { GameInfo } from "$ipc/main-renderer";

import { IpcContext } from "../../ipc/IpcContext.mjs";
import { useAppDispatch, useAppSelector } from "../../utils/redux.mts";
import { loadGamesFromMain, selectGameList } from "./gamesSlice.mts";

export default function Games() {
  const ipcContext = useContext(IpcContext);
  const store = useAppDispatch();
  const games = useAppSelector(selectGameList);

  useEffect(() => {
    store(loadGamesFromMain({ gameInfo: ipcContext!.gameInfo })).catch(() => {
      // FIXME: navigate to error page
    });
  }, [ipcContext, store]);

  const headers: { key: keyof GameInfo; header: string }[] = [
    {
      key: "id",
      header: "ID",
    },
    {
      key: "rid",
      header: "TFGames ID",
    },
    {
      key: "name",
      header: "Name",
    },
    {
      key: "lastUpdate",
      header: "Last Update",
    },
  ];

  return (
    <DataTable headers={headers} rows={games}>
      {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                // @ts-expect-error TableHeader has incorrect typings, see: https://github.com/carbon-design-system/carbon/issues/14831
                <TableHeader {...getHeaderProps({ header })} key={header.key}>
                  {header.header}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow {...getRowProps({ row })} key={row.id}>
                {row.cells.map((cell) => (
                  <TableCell key={cell.id}>{cell.value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
}
