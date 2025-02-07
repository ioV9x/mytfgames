import "./AddGameModal.scss";

import { FolderOpen } from "@carbon/icons-react";
import {
  Button,
  CodeSnippet,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  TextArea,
  TextInput,
  Toggle,
} from "@carbon/react";
import { produce } from "immer";
import { useState } from "react";

import { GameSId } from "$ipc/main-renderer";
import { useIpc } from "$renderer/ipc";
import { errorToString } from "$renderer/utils";

export interface AddGameRequest {
  readonly title: string;
  readonly platform: string;
  readonly genre: string;
  readonly rating: number;
}

interface AddGameFormState {
  mode: "new" | "import";
  submitting: boolean;
  import: {
    path: string | undefined;
  };
  manual: {
    name: string | undefined;
    note: string;
  };
  error: string | undefined;
}

export interface AddGameModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onAddGame: (newGameId: GameSId) => void;
}
export function AddGameModal({ open, onClose, onAddGame }: AddGameModalProps) {
  const { import: imports, games } = useIpc();
  const [state, setState] = useState<AddGameFormState>({
    mode: "new",
    submitting: false,
    import: { path: undefined },
    manual: { name: undefined, note: "" },
    error: undefined,
  });

  function onSubmit() {
    const addTask =
      state.mode === "new"
        ? games.createCustomGame({
            name: state.manual.name!,
            note: state.manual.note,
          })
        : imports.importGameInfoFromFolder(state.import.path!);

    addTask.then(onAddGame, (error: unknown) =>
      setState(
        produce((draft) => {
          draft.error = errorToString(error);
        }),
      ),
    );
  }

  return (
    <ComposedModal
      open={open}
      onClose={onClose}
      preventCloseOnClickOutside={state.submitting}
    >
      <ModalHeader label="Game Library" title="Add or import game" />

      <ModalBody>
        <p className="games--add-game-modal--intro">
          Add a new game entry to yor library. You can either create a new game
          entry manually or import an existing game from metadata files provided
          by the game artifact. Currently the import feature is only supported
          for extracted game artifacts that contain a{" "}
          <CodeSnippet type="inline" hideCopyButton>
            .meta
          </CodeSnippet>{" "}
          directory.
        </p>
        <Stack orientation="vertical" gap={7}>
          <Toggle
            id="add-game-import-metadata"
            data-modal-primary-focus
            labelText="Import from metadata"
            toggled={state.mode === "import"}
            onToggle={(checked) =>
              setState(
                produce((draft) => {
                  draft.mode = checked ? "import" : "new";
                }),
              )
            }
          />
          {state.mode === "import" ? (
            <ImportGameForm state={state} setState={setState} />
          ) : (
            <NewGameForm state={state} setState={setState} />
          )}
          {state.error != null && (
            <InlineNotification
              kind="error"
              title="Add game failed"
              onCloseButtonClick={() =>
                setState((state) => ({ ...state, error: undefined }))
              }
            >
              {state.error}
            </InlineNotification>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} disabled={state.submitting}>
          Cancel
        </Button>
        <Button
          kind="primary"
          onClick={onSubmit}
          disabled={state.submitting || !validateForm(state)}
        >
          Add game
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

interface AddGameModalSubFormProps {
  readonly state: AddGameFormState;
  readonly setState: React.Dispatch<React.SetStateAction<AddGameFormState>>;
}

function NewGameForm({ state, setState }: AddGameModalSubFormProps) {
  return (
    <>
      <TextInput
        id="new-game-name"
        labelText="Name (required)"
        required={true}
        placeholder="Example: Secretary"
        helperText="This is the name of the game as you know it"
        value={state.manual.name ?? ""}
        invalid={state.manual.name === ""}
        invalidText="This field is required"
        disabled={state.submitting}
        onChange={(ev) =>
          setState(
            produce((draft) => {
              draft.manual.name = ev.target.value;
            }),
          )
        }
      />
      <TextArea
        id="new-game-note"
        labelText="Note"
        required={false}
        placeholder="Didn't like the game, because…"
        value={state.manual.note}
        disabled={state.submitting}
        onChange={(ev) =>
          setState(
            produce((draft) => {
              draft.manual.note = ev.target.value;
            }),
          )
        }
      />
    </>
  );
}

function ImportGameForm({ state, setState }: AddGameModalSubFormProps) {
  const { shellDialog } = useIpc();

  return (
    <>
      <div className="games--add-game-modal--folder-select">
        <TextInput
          id="new-game-import-path"
          labelText="Artifact directory path"
          required={true}
          value={state.import.path ?? ""}
          invalid={state.import.path === ""}
          invalidText="This field is required"
          disabled={state.submitting}
          onChange={(ev) =>
            setState(
              produce((draft) => {
                draft.import.path = ev.target.value;
              }),
            )
          }
        />

        <Button
          hasIconOnly
          size="md"
          renderIcon={FolderOpen}
          iconDescription="Select directory"
          disabled={state.submitting}
          onClick={() =>
            void shellDialog.openDirectoryChooser().then((path) => {
              if (path == null) {
                return;
              }
              setState(
                produce((draft) => {
                  draft.import.path = path;
                }),
              );
            })
          }
        />
      </div>
    </>
  );
}

function validateForm(state: AddGameFormState): boolean {
  return (
    (state.mode === "import" && !!state.import.path) ||
    (state.mode === "new" && state.manual.name != null)
  );
}
