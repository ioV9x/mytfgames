import "./CreateLocalGamePage.scss";

import { Button, Column, ComboBox, Form, Grid, TextInput } from "@carbon/react";
import { ComboBoxProps } from "@carbon/react/lib/components/ComboBox/ComboBox";
import { FormEvent, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";

import { LocalGameId } from "$ipc/main-renderer";
import {
  EntityRetrievalState,
  useAppDispatch,
  useAppSelector,
} from "$renderer/utils";

import { RemoteGameId } from "../../../../ipc/main-renderer/RemoteGameDataService.mts";
import { IpcContext } from "../../../ipc/IpcContext.mjs";
import {
  loadRemoteGamesById,
  selectRemoteGameById,
  selectRemoteGamesById,
} from "../../remote-games/RemoteGamesSlice.mts";
import { createLocalGame } from "../LocalGamesSlice.mts";

export default function NewLocalGame() {
  const dispatch = useAppDispatch();
  const { localGames } = useContext(IpcContext)!;
  const [_, setLocation] = useLocation();

  const [name, setName] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [_1, setSubmitError] = useState<string | undefined>(undefined);

  const [selectedGameId, setSelectedRemoteGameId] =
    useState<RemoteGameId | null>(null);
  const selectedGame = useAppSelector((state) =>
    selectedGameId ? selectRemoteGameById(state, selectedGameId) : undefined,
  );

  useEffect(() => {
    if (name === "" && selectedGame?.type === EntityRetrievalState.Loaded) {
      setName(selectedGame.name);
    }
  }, [selectedGame]);

  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (submitted) {
      return;
    }

    setSubmitted(true);
    dispatch(
      createLocalGame({
        localGames,
        game: {
          name,
          remoteGameId: selectedGameId ?? undefined,
        },
      }),
    )
      .then((resolved) => {
        if (resolved.type === "localGames/createLocalGame/fulfilled") {
          setLocation(`/local-games/${resolved.payload as LocalGameId}`);
        } else {
          throw resolved.payload;
        }
      })
      .catch((error: unknown) => {
        setSubmitted(false);
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        setSubmitError(error instanceof Error ? error.message : `${error}`);
        console.error(error);
      });
  }

  return (
    <Grid>
      <Column className="local-game-create-page__banner" sm={4} md={8} lg={16}>
        <h1 className="">Add a new Game</h1>
      </Column>
      <Column sm={4} md={6}>
        <Form onSubmit={onSubmit} aria-disabled={submitted}>
          <Grid>
            <Column sm="100%" className="local-game-create-page__form_row">
              <RemoteGameComboBox
                id="remoteGame"
                titleText="Remote Game"
                helperText="Select a game from the online DB to associate with this local game."
                warnText="A game in this game library has already been associated with the selected one."
                selectedItem={selectedGameId}
                onChange={(remoteGameId) =>
                  setSelectedRemoteGameId(remoteGameId)
                }
                disabled={submitted}
              />
            </Column>
            <Column sm="100%" className="local-game-create-page__form_row">
              <TextInput
                id="name"
                labelText="Name (required)"
                required={true}
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="Example: Secretary"
                disabled={submitted}
              />
            </Column>
            <Column
              sm="100%"
              className="local-game-create-page__form_row_last"
            ></Column>
            <Column sm={2} md={3}>
              <Button
                type="submit"
                kind="primary"
                className="local-game-create-page__button"
                disabled={submitted}
              >
                Add Game
              </Button>
            </Column>
            <Column sm={2} md={3}>
              <Button
                type="button"
                kind="secondary"
                className="local-game-create-page__button"
                disabled={submitted}
              >
                Cancel
              </Button>
            </Column>
          </Grid>
        </Form>
      </Column>
    </Grid>
  );
}

type ComboBoxForwarded =
  | "id"
  | "className"
  | "disabled"
  | "titleText"
  | "helperText"
  | "warnText";
interface RemoteGameComboBoxProps
  extends Pick<ComboBoxProps<RemoteGameId>, ComboBoxForwarded> {
  selectedItem?: RemoteGameId | null;
  onChange: (game: RemoteGameId | null) => void;
}
function RemoteGameComboBox({
  id,
  selectedItem,
  onChange,
  ...comboBoxProps
}: RemoteGameComboBoxProps) {
  const ipcContext = useContext(IpcContext)!;
  const { remoteGames } = ipcContext;
  const dispatch = useAppDispatch();
  const [gameIds, setGameIds] = useState<RemoteGameId[]>(
    selectedItem ? [selectedItem] : [],
  );

  const games = useAppSelector((state) =>
    selectRemoteGamesById(state, gameIds),
  );

  useEffect(() => {
    if (gameIds.length > 0) {
      void dispatch(loadRemoteGamesById({ ids: gameIds, remoteGames }));
    }
  }, [ipcContext, dispatch, gameIds]);

  return (
    <ComboBox
      {...comboBoxProps}
      id={id}
      items={games}
      shouldFilterItem={({ item, inputValue }) =>
        item != null &&
        inputValue != null &&
        item.type === EntityRetrievalState.Loaded &&
        item.name.startsWith(inputValue)
      }
      selectedItem={
        typeof selectedItem === "number"
          ? games.find((game) => game?.id === selectedItem)
          : selectedItem
      }
      onChange={({ selectedItem }) => onChange(selectedItem?.id ?? null)}
      itemToString={(game) =>
        game?.type === EntityRetrievalState.Loaded
          ? `${game.name} (id: ${game.id})`
          : "<loading>"
      }
      onInputChange={(inputText) => {
        if (inputText.length === 2) {
          void remoteGames.findGamesByNamePrefix(inputText).then(setGameIds);
        } else if (inputText.length < 2) {
          setGameIds([]);
        }
      }}
    />
  );
}
