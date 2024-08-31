import "./GamePage.scss";

import {
  Column,
  Grid,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
} from "@carbon/react";
import { useEffect } from "react";

import { GameSId, makeGameDisplayName } from "$ipc/main-renderer";
import { Game, LoadedGame, loadGamesById } from "$renderer/dux/games";
import { useAppDispatch, useAppSelector } from "$renderer/dux/utils";
import { useIpc } from "$renderer/ipc";
import {
  EntityRetrievalState,
  errorToString,
  formatGameTimestamp,
} from "$renderer/utils";

const classNs = "games-game-view";

export interface GamePageProps {
  gameId: GameSId;
}
export default function GamePage({ gameId }: GamePageProps) {
  const { games } = useIpc();
  const dispatch = useAppDispatch();
  const game = useAppSelector((state) => state.games.entities[gameId]);

  useEffect(() => {
    if (game?.type !== EntityRetrievalState.Loaded) {
      void dispatch(
        loadGamesById({
          games,
          ids: [gameId],
        }),
      );
    }
  }, [dispatch, game, gameId, games]);

  return (
    <GameView
      game={game ?? { type: EntityRetrievalState.Loading, id: gameId }}
    />
  );
}

export interface GameViewProps {
  game: Game;
}
export function GameView({ game }: GameViewProps) {
  if (game.type === EntityRetrievalState.Loading) {
    return <GameViewLoading gameId={game.id} />;
  } else if (game.type === EntityRetrievalState.Error) {
    return <GameViewError gameId={game.id} error={game.error} />;
  }

  return <GameViewLoaded game={game} />;
}

interface GameViewLoadedProps {
  game: LoadedGame;
}
function GameViewLoaded({ game }: GameViewLoadedProps) {
  return (
    <>
      <section className={`${classNs}__header`}>
        <Grid>
          <Column sm="100%">
            <h1>{makeGameDisplayName(game)}</h1>
          </Column>
        </Grid>
      </section>

      <section className={`${classNs}__content`}>
        <Grid>
          {game.listing && (
            <Column sm={4} md={8} className="games-game-view__content-listing">
              <GameOfficialListing listing={game.listing} />
            </Column>
          )}
          {game.description && (
            <Column
              sm={4}
              md={8}
              className="games-game-view__content-description"
            >
              <GameDescription description={game.description} />
            </Column>
          )}
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
        description.user_rating < 0 ? (
          <i>Unrated</i>
        ) : (
          description.user_rating.toString()
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
