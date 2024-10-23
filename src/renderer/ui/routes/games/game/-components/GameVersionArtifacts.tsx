import "./GameVersionArtifacts.scss";

import { Add } from "@carbon/icons-react";
import {
  Button,
  ButtonSize,
  DataTable,
  Dropdown,
  Modal,
  Stack,
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
import { useState } from "react";
import { createPortal } from "react-dom";

import {
  ArtifactPlatform,
  ArtifactService,
  GameSId,
  GameVersion,
} from "$ipc/main-renderer";
import {
  selectArtifactPlatforms,
  selectGameVersionsForGame,
} from "$renderer/dux/game-versions";
import { useAppSelector } from "$renderer/dux/utils";
import { useIpc } from "$renderer/ipc";

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
  gameSId: GameSId;
  versions: GameVersion[];
}
export function GameVersionArtifacts({
  gameSId,
  versions,
}: GameVersionArtifactsProps) {
  const artifactPlatforms = useAppSelector((state) =>
    selectArtifactPlatforms(state),
  );
  const artifacts = versions.flatMap((version) =>
    version.artifacts.map((artifact) => ({
      id: `${version.version}|${artifact.platform}`,
      version: version.version,
      platform:
        artifactPlatforms.find((platform) => platform.id === artifact.platform)
          ?.name ?? "invalid-value",
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
        getToolbarProps,
      }) => (
        <TableContainer
          className="games-game__version-artifacts"
          title="Artifacts"
          {...getTableContainerProps()}
        >
          <TableToolbar {...getToolbarProps()}>
            <TableToolbarContent>
              <ImportArtifactButton gameSId={gameSId} size="sm" />
            </TableToolbarContent>
          </TableToolbar>
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

interface ImportArtifactButtonProps {
  gameSId: GameSId;
  size: ButtonSize;
}
function ImportArtifactButton({ gameSId, size }: ImportArtifactButtonProps) {
  const artifactPlatforms = useAppSelector((state) =>
    selectArtifactPlatforms(state),
  );
  const versions = useAppSelector((state) =>
    selectGameVersionsForGame(state, { gameId: gameSId }),
  );
  const { artifacts } = useIpc();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [version, setVersion] = useState<string | null>(
    versions?.reduce<string | null>(
      (acc, v) => (v.version.localeCompare(acc ?? "") > 0 ? v.version : acc),
      null,
    ) ?? null,
  );
  const [platform, setPlatform] = useState<ArtifactPlatform | null>(null);

  return (
    <>
      {typeof document === "undefined"
        ? null
        : createPortal(
            <Modal
              open={open}
              onRequestClose={() => setOpen(false)}
              onRequestSubmit={() => {
                if (version == null || platform == null) {
                  return;
                }

                setSubmitting(true);
                startImportFromFilesystem(
                  artifacts,
                  gameSId,
                  version,
                  platform.id,
                ).then(
                  () => {
                    setSubmitting(false);
                    setOpen(false);
                  },
                  (error: unknown) => {
                    console.error(error);
                  },
                );
              }}
              size="sm"
              modalHeading="Import an Artifact"
              modalLabel="Game Artifacts"
              primaryButtonText="Select Directory to Import"
              primaryButtonDisabled={
                submitting || version == null || platform == null
              }
              secondaryButtonText="Cancel"
            >
              <Stack gap={5}>
                <Dropdown
                  id="import-artifact-version"
                  titleText="Version"
                  label="Select the artifact's version"
                  items={versions?.map((version) => version.version) ?? []}
                  selectedItem={version}
                  onChange={({ selectedItem }) => setVersion(selectedItem)}
                  invalid={version == null}
                  invalidText="Please select a version"
                  disabled={submitting}
                  autoAlign
                />
                <Dropdown
                  id="import-artifact-platform"
                  titleText="Platform"
                  label="Select the artifact's platform"
                  items={artifactPlatforms}
                  itemToString={(def) => def?.name ?? ""}
                  selectedItem={platform}
                  onChange={({ selectedItem }) => setPlatform(selectedItem)}
                  invalid={platform == null}
                  invalidText="Please select a platform"
                  disabled={submitting}
                  autoAlign
                />
              </Stack>
            </Modal>,
            document.body,
          )}
      <Button
        size={size}
        renderIcon={Add}
        onClick={() => setOpen(true)}
        disabled={(versions?.length ?? 0) <= 0}
      >
        Import Artifact
      </Button>
    </>
  );
}

async function startImportFromFilesystem(
  artifacts: typeof ArtifactService,
  gameId: GameSId,
  version: string,
  platform: string,
) {
  const path = await artifacts.openDirectoryChooser();
  if (path == null) {
    return;
  }

  await artifacts.startImportFromFilesystem(gameId, version, platform, path);
}
