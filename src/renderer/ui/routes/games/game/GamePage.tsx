import { Column, Grid } from "@carbon/react";
import { useEffect } from "react";

import { GameSId, makeGameDisplayName } from "$ipc/main-renderer";
import { loadGamesById } from "$renderer/dux/games";
import { useAppDispatch, useAppSelector } from "$renderer/dux/utils";
import { useIpc } from "$renderer/ipc";
import { EntityRetrievalState } from "$renderer/utils";

export interface GameViewPageProps {
  gameId: GameSId;
}
export default function GameViewPage({ gameId }: GameViewPageProps) {
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

  if (game == null || game.type === EntityRetrievalState.Loading) {
    return <Grid>Loading {gameId}...</Grid>;
  } else if (game.type === EntityRetrievalState.Error) {
    return (
      <Grid>
        Error loading {gameId}: {game.error}
      </Grid>
    );
  }

  return (
    <Grid>
      <Column>{gameId}</Column>
      <Column>{makeGameDisplayName(game)}</Column>
    </Grid>
  );
}