import "./GameVersionSources.scss";

import {
  DataTable,
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

import { GameVersion } from "$ipc/main-renderer";
import { ExternalLink } from "$renderer/components";

const GameVersionSourceTableHeaders = [
  {
    key: "version",
    header: "Version",
  },
  {
    key: "uri",
    header: "Source Link",
  },
  {
    key: "officialNote",
    header: "Official Note",
  },
];

export interface GameVersionSourcesProps {
  versions: GameVersion[];
}
export function GameVersionSources({ versions }: GameVersionSourcesProps) {
  const sources = versions.flatMap((version) =>
    version.sources.map((source) => ({
      id: `${version.version}|${source.uri}`,
      version: version.version,
      uri: (
        <ExternalLink href={source.uri}>
          {new URL(source.uri).hostname}
        </ExternalLink>
      ),
      officialNote:
        source.officialNote === "" ? <i>N/A</i> : source.officialNote,
    })),
  );

  return (
    <DataTable
      headers={GameVersionSourceTableHeaders}
      rows={sources}
      isSortable
      size="sm"
    >
      {({
        getTableContainerProps,
        getTableProps,
        headers,
        getHeaderProps,
        rows,
        getRowProps,
      }) => (
        <TableContainer
          className="games-game__version-sources"
          title="Game Version Sources"
          {...getTableContainerProps()}
        >
          <TableToolbar>
            <TableToolbarContent />
          </TableToolbar>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader
                    {...getHeaderProps({ header })}
                    key={header.key}
                    isSortable={header.key !== "uri"}
                  >
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  {...getRowProps({
                    row,
                  })}
                  key={row.id}
                >
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
}
