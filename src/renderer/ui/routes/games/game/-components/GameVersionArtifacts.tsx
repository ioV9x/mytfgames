import "./GameVersionArtifacts.scss";

import { Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  ButtonSize,
  ComboBox,
  DataTable,
  Dropdown,
  Modal,
  Stack,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
} from "@carbon/react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  ArtifactPlatform,
  ArtifactService,
  GameSId,
  GameVersion,
  ShellDialogService,
} from "$ipc/main-renderer";
import {
  selectArtifactPlatforms,
  selectGameVersionsForGame,
} from "$renderer/dux/game-versions";
import { useAppSelector } from "$renderer/dux/utils";
import { useIpc } from "$renderer/ipc";

const GameVersionArtifactTableHeaders: {
  key: keyof ArtifactRowViewState;
  header: string;
}[] = [
  {
    key: "version",
    header: "Version",
  },
  {
    key: "platformName",
    header: "Platform",
  },
];

interface ArtifactRowViewState {
  id: string;
  version: string;
  platform: string;
  platformName: string;
  disabled: boolean;
}

function makeId(version: string, platform: string) {
  return `${version}|${platform}`;
}

export interface GameVersionArtifactsProps {
  gameSId: GameSId;
  versions: GameVersion[];
}
export function GameVersionArtifacts({
  gameSId,
  versions,
}: GameVersionArtifactsProps) {
  const { artifacts } = useIpc();
  const artifactPlatforms = useAppSelector((state) =>
    selectArtifactPlatforms(state),
  );
  const artifactRows = useMemo<ArtifactRowViewState[]>(
    () =>
      versions.flatMap((version) =>
        version.artifacts.map((artifact) => ({
          id: makeId(version.version, artifact.platform),
          version: version.version,
          platform: artifact.platform,
          platformName:
            artifactPlatforms.find(
              (platform) => platform.id === artifact.platform,
            )?.name ?? artifact.platform,
          disabled: artifact.disabled,
        })),
      ),
    [artifactPlatforms, versions],
  );

  return (
    <DataTable
      headers={GameVersionArtifactTableHeaders}
      rows={artifactRows}
      isSortable
      size="sm"
    >
      {({
        getTableContainerProps,
        getTableProps,
        getBatchActionProps,
        getSelectionProps,
        headers,
        rows,
        selectedRows,
        selectRow,
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
            <TableBatchActions {...getBatchActionProps()}>
              <TableBatchAction
                renderIcon={TrashCan}
                iconDescription="Delete the selected artifacts"
                onClick={() =>
                  selectedRows.map((row) => {
                    const artifact = artifactRows.find((r) => r.id === row.id);
                    if (artifact != null) {
                      if (artifact.disabled) {
                        selectRow(row.id);
                        return;
                      }
                      artifacts
                        .queueArtifactForDeletion(
                          gameSId,
                          artifact.version,
                          artifact.platform,
                        )
                        .catch((error: unknown) =>
                          console.error(artifact, error),
                        );
                    }
                  })
                }
                tabIndex={getBatchActionProps().shouldShowBatchActions ? 0 : -1}
              >
                Delete
              </TableBatchAction>
            </TableBatchActions>
            <TableToolbarContent>
              <ImportArtifactButton gameSId={gameSId} size="sm" />
            </TableToolbarContent>
          </TableToolbar>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                <TableSelectAll {...getSelectionProps()} />
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
                  <TableSelectRow
                    {...getSelectionProps({
                      row,
                    })}
                    disabled={row.disabled}
                  />
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
  const { artifacts, shellDialog } = useIpc();
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
                  shellDialog,
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
                <ComboBox
                  id="import-artifact-version"
                  titleText="Version"
                  helperText="Select the artifact's version or create a new one"
                  items={versions?.map((version) => version.version) ?? []}
                  selectedItem={version}
                  onChange={({ selectedItem, inputValue }) =>
                    setVersion(selectedItem ?? inputValue ?? null)
                  }
                  invalid={version == null}
                  invalidText="Please select a version"
                  disabled={submitting}
                  allowCustomValue
                  typeahead
                  autoAlign
                />
                <Dropdown
                  id="import-artifact-platform"
                  titleText="Platform"
                  label="Select the artifact's platform"
                  helperText="Select the artifact's platform"
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
  shellDialogs: typeof ShellDialogService,
  artifacts: typeof ArtifactService,
  gameId: GameSId,
  version: string,
  platform: string,
) {
  const path = await shellDialogs.openDirectoryChooser();
  if (path == null) {
    return;
  }

  await artifacts.startImportFromFilesystem(gameId, version, platform, path);
}
