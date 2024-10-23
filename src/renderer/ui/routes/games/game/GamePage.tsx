import "./GamePage.scss";

import {
  Button,
  Column,
  Form,
  Grid,
  Modal,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  TextArea,
  TextInput,
} from "@carbon/react";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { GameSId, GameVersion, makeGameDisplayName } from "$ipc/main-renderer";
import {
  loadGameVersionsForGame,
  selectGameVersionsForGame,
} from "$renderer/dux/game-versions";
import { Game, LoadedGame, loadGamesById } from "$renderer/dux/games";
import { useAppDispatch, useAppSelector } from "$renderer/dux/utils";
import { useIpc } from "$renderer/ipc";
import {
  EntityRetrievalState,
  errorToString,
  formatGameTimestamp,
} from "$renderer/utils";

import { GameVersionArtifacts } from "./-components/GameVersionArtifacts";
import { GameVersionSources } from "./-components/GameVersionSources";

const classNs = "games-game-view";

export interface GamePageProps {
  gameId: GameSId;
}
export default function GamePage({ gameId }: GamePageProps) {
  const { games, gameVersions } = useIpc();
  const dispatch = useAppDispatch();
  const game = useAppSelector((state) => state.games.entities[gameId]);
  const versions = useAppSelector((state) =>
    selectGameVersionsForGame(state, { gameId }),
  );

  useEffect(() => {
    if (game?.type !== EntityRetrievalState.Loaded) {
      void dispatch(
        loadGamesById({
          games,
          ids: [gameId],
        }),
      );
    }
    if (versions == null) {
      void dispatch(
        loadGameVersionsForGame({
          gameId,
          gameVersions: gameVersions,
        }),
      );
    }
  }, [dispatch, game, gameId, games, gameVersions, versions]);

  return (
    <GameView
      game={game ?? { type: EntityRetrievalState.Loading, id: gameId }}
      versions={versions ?? []}
    />
  );
}

export interface GameViewProps {
  game: Game;
  versions: GameVersion[];
}
export function GameView({ game, versions }: GameViewProps) {
  if (game.type === EntityRetrievalState.Loading) {
    return <GameViewLoading gameId={game.id} />;
  } else if (game.type === EntityRetrievalState.Error) {
    return <GameViewError gameId={game.id} error={game.error} />;
  }

  return <GameViewLoaded game={game} versions={versions} />;
}

interface GameViewLoadedProps {
  game: LoadedGame;
  versions: GameVersion[];
}
function GameViewLoaded({ game, versions }: GameViewLoadedProps) {
  return (
    <>
      <section className={`${classNs}__header`}>
        <Grid>
          <Column sm="100%" md={10} lg={14}>
            <h1>{makeGameDisplayName(game)}</h1>
          </Column>
          <Column sm="100%" md={2}>
            <EditGameDescriptionButton
              gameId={game.id}
              listing={game.listing}
              description={game.description}
            />
          </Column>
        </Grid>
      </section>

      <section className={`${classNs}__content`}>
        <Grid>
          <Column sm={4} md={8}>
            <Stack gap={5} orientation="vertical">
              {game.listing && <GameOfficialListing listing={game.listing} />}
              {game.description && (
                <GameDescription description={game.description} />
              )}
            </Stack>
          </Column>

          <Column sm={4} md={8}>
            <Stack gap={5} orientation="vertical">
              <GameVersionArtifacts gameSId={game.id} versions={versions} />
              <GameVersionSources versions={versions} />
            </Stack>
          </Column>
        </Grid>
      </section>
    </>
  );
}

interface GameDescriptionProps {
  description: NonNullable<LoadedGame["description"]>;
}
function GameDescription({ description }: GameDescriptionProps) {
  const displayProps = [
    {
      key: "lastChangeTimestamp",
      label: "Last Changed",
      value: formatGameTimestamp(description.lastChangeTimestamp),
    },
    {
      key: "lastPlayedTimestamp",
      label: "Last Played",
      value:
        description.lastPlayedTimestamp === "" ? (
          <i>Never played</i>
        ) : (
          formatGameTimestamp(description.lastPlayedTimestamp)
        ),
    },
    {
      key: "user_rating",
      label: "User Rating",
      value:
        description.userRating < 0 ? (
          <i>Unrated</i>
        ) : (
          description.userRating.toString()
        ),
    },
  ];
  return (
    <>
      <h2>User Description</h2>
      <StructuredListWrapper
        isCondensed
        className="games-game-view__content-prop-list"
      >
        <StructuredListBody>
          {displayProps.map((prop) => (
            <StructuredListRow key={prop.key}>
              <StructuredListCell>{prop.label}</StructuredListCell>
              <StructuredListCell>{prop.value}</StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>
      {description.note && (
        <>
          <h3>Note</h3> <p>{description.note}</p>
        </>
      )}
    </>
  );
}

interface GameOfficialListingProps {
  listing: NonNullable<LoadedGame["listing"]>;
}
function GameOfficialListing({ listing }: GameOfficialListingProps) {
  const displayProps = [
    { key: "tfGamesId", label: "TFGames Site ID", value: listing.tfgamesId },
    { key: "numLikes", label: "Likes", value: listing.numLikes },
    {
      key: "lastUpdateTimestamp",
      label: "Last Updated",
      value: formatGameTimestamp(listing.lastUpdateTimestamp),
    },
  ];
  return (
    <>
      <h2>Official Game Information</h2>
      <StructuredListWrapper isCondensed>
        <StructuredListBody>
          {displayProps.map((prop) => (
            <StructuredListRow key={prop.key}>
              <StructuredListCell>{prop.label}</StructuredListCell>
              <StructuredListCell>{prop.value}</StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>
    </>
  );
}

interface GameViewLoadingProps {
  gameId: GameSId;
}
function GameViewLoading({ gameId }: GameViewLoadingProps) {
  return (
    <Grid>
      <Column sm="100%">Loading {gameId}...</Column>
    </Grid>
  );
}

interface GameViewErrorProps {
  gameId: GameSId;
  error: unknown;
}
function GameViewError({ gameId, error }: GameViewErrorProps) {
  return (
    <Grid>
      <Column sm="100%">
        Error while loading {gameId}: {errorToString(error)}
      </Column>
    </Grid>
  );
}

interface EditGameDescriptionButtonProps {
  gameId: GameSId;
  description: LoadedGame["description"];
  listing?: LoadedGame["listing"];
}
function EditGameDescriptionButton({
  gameId,
  description,
  listing,
}: EditGameDescriptionButtonProps) {
  const ipc = useIpc();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(description?.name ?? listing?.name ?? "");
  const [note, setNote] = useState(description?.note ?? "");

  const submit = async () => {
    setSubmitting(true);
    try {
      await ipc.games.updateGameDescription(gameId, {
        name,
        userRating: -1,
        note,
      });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {typeof document === "undefined"
        ? null
        : ReactDOM.createPortal(
            <Modal
              open={open}
              aria-disabled={submitting}
              onRequestClose={() => setOpen(false)}
              onRequestSubmit={() => void submit()}
              modalHeading="Edit Game Description"
              secondaryButtonText="Cancel"
              primaryButtonText="Update"
              primaryButtonDisabled={name === ""}
            >
              <Form>
                <Stack gap={6}>
                  <TextInput
                    id="name"
                    labelText="Name (required)"
                    required={true}
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    placeholder="Example: Secretary"
                    helperText="This is the name of the game as you know it"
                    invalid={name === ""}
                    invalidText="This field is required"
                    disabled={submitting}
                  />
                  <TextArea
                    id="note"
                    labelText="Note"
                    required={false}
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                    placeholder="Didn't like the game, because…"
                    disabled={submitting}
                  />
                </Stack>
              </Form>
            </Modal>,
            document.body,
          )}
      <Button kind="primary" onClick={() => setOpen(true)}>
        Edit
      </Button>
    </>
  );
}
