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
  TextInput,
  Toggle,
} from "@carbon/react";
import { produce } from "immer";
import { useReducer } from "react";

import { GameSId } from "$ipc/main-renderer";
import { useIpc } from "$renderer/ipc";

export interface AddGameRequest {
  readonly title: string;
  readonly platform: string;
  readonly genre: string;
  readonly rating: number;
}

enum AddGameModalActionType {
  SetError = "setError",
  ResetError = "resetError",
  SetMode = "toggleMode",
  SetPath = "setPath",
}
type AddGameModalAction =
  | { type: AddGameModalActionType.SetMode; mode: "new" | "import" }
  | { type: AddGameModalActionType.SetPath; path: string }
  | { type: AddGameModalActionType.SetError; error: string }
  | { type: AddGameModalActionType.ResetError };
interface AddGameFormState {
  mode: "new" | "import";
  submitting: boolean;
  import: {
    path: string | undefined;
  };
  error: string | undefined;
}

export interface AddGameModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onAddGame: (newGameId: GameSId) => void;
}
export function AddGameModal({ open, onClose, onAddGame }: AddGameModalProps) {
  const { import: imports } = useIpc();
  const [state, dispatch] = useReducer(
    produce((draft: AddGameFormState, action: AddGameModalAction) => {
      switch (action.type) {
        case AddGameModalActionType.SetMode:
          draft.mode = action.mode;
          break;
        case AddGameModalActionType.SetPath:
          draft.import.path = action.path;
          break;
        case AddGameModalActionType.SetError:
          draft.error = action.error;
          break;
        case AddGameModalActionType.ResetError:
          draft.error = undefined;
          break;
      }
    }),
    {
      mode: "new",
      submitting: false,
      import: { path: undefined },
      error: undefined,
    },
  );

  function onSubmit() {
    if (state.mode === "new") {
      dispatch({
        type: AddGameModalActionType.SetError,
        error: "Not implemented",
      });
    } else {
      imports
        .importGameInfoFromFolder(state.import.path!)
        .then(onAddGame, (error: unknown) =>
          dispatch({
            type: AddGameModalActionType.SetError,
            error: error?.toString() ?? "null/undefined error",
          }),
        );
    }
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
              dispatch({
                type: AddGameModalActionType.SetMode,
                mode: checked ? "import" : "new",
              })
            }
          />
          {state.mode === "import" ? (
            <ImportGameForm state={state} dispatch={dispatch} />
          ) : (
            <NewGameForm state={state} dispatch={dispatch} />
          )}
          {state.error != null && (
            <InlineNotification
              kind="error"
              title="Add game failed"
              onCloseButtonClick={() =>
                dispatch({ type: AddGameModalActionType.ResetError })
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
  readonly dispatch: React.Dispatch<AddGameModalAction>;
}

function NewGameForm({ state, dispatch }: AddGameModalSubFormProps) {
  return (
    <>
      <TextInput id="s" labelText="Game name" placeholder="Secretary" />
    </>
  );
}

function ImportGameForm({ state, dispatch }: AddGameModalSubFormProps) {
  const { shellDialog } = useIpc();

  return (
    <>
      <div className="games--add-game-modal--folder-select">
        <TextInput
          id="ss"
          labelText="Artifact directory path"
          value={state.import.path}
          onChange={(ev) =>
            dispatch({
              type: AddGameModalActionType.SetPath,
              path: ev.target.value,
            })
          }
        />

        <Button
          hasIconOnly
          size="md"
          renderIcon={FolderOpen}
          iconDescription="Select directory"
          onClick={() =>
            void shellDialog.openDirectoryChooser().then((path) => {
              if (path == null) {
                return;
              }
              dispatch({
                type: AddGameModalActionType.SetPath,
                path,
              });
            })
          }
        />
      </div>
    </>
  );
}

function validateForm(state: AddGameFormState): boolean {
  return state.mode === "import" && state.import.path != null;
}
