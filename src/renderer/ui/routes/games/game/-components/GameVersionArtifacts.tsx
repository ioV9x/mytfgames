import "./GameVersionArtifacts.scss";

import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";

import { GameVersion } from "$ipc/main-renderer";

const GameVersionArtifactTableHeaders = [
  {
    key: "version",
    header: "Version",
  },
  {
    key: "platform",
    header: "Platform",
  },
];

export interface GameVersionArtifactsProps {
  versions: GameVersion[];
}
export function GameVersionArtifacts({ versions }: GameVersionArtifactsProps) {
  const artifacts = versions.flatMap((version) =>
    version.artifacts.map((artifact) => ({
      id: `${version.version}|${artifact.platform}`,
      version: version.version,
      platform: artifact.platform,
    })),
  );

  return (
    <DataTable
      headers={GameVersionArtifactTableHeaders}
      rows={artifacts}
      isSortable
      size="sm"
    >
      {({
        getTableContainerProps,
        getTableProps,
        headers,
        rows,
        getRowProps,
        getHeaderProps,
      }) => (
        <TableContainer
          className="games-game__version-artifacts"
          title="Artifacts"
          {...getTableContainerProps()}
        >
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader
                    {...getHeaderProps({ header })}
                    key={header.key}
                    isSortable={header.key === "version"}
                  >
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
        </TableContainer>
      )}
    </DataTable>
  );
}
