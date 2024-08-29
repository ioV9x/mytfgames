import { Grid } from "@carbon/react";
import { useContext, useEffect } from "react";

import { LocalGameId } from "$ipc/main-renderer";
import { useAppDispatch, useAppSelector } from "$renderer/dux/utils";
import { IpcContext } from "$renderer/ipc";
import { EntityRetrievalState } from "$renderer/utils";

import { loadLocalGamesById } from "../LocalGamesSlice.mts";

export interface LocalGameViewProps {
  gameId: LocalGameId;
}
export default function LocalGameViewPage({ gameId }: LocalGameViewProps) {
  const ipcContext = useContext(IpcContext)!;
  const dispatch = useAppDispatch();
  const game = useAppSelector((state) => state.localGames.entities[gameId]);

  useEffect(() => {
    if (game?.type !== EntityRetrievalState.Loaded) {
      void dispatch(
        loadLocalGamesById({
          localGames: ipcContext.localGames,
          ids: [gameId],
        }),
      );
    }
  }, [game]);

  if (game == null || game.type === EntityRetrievalState.Loading) {
    return <Grid>Loading {gameId}...</Grid>;
  } else if (game.type === EntityRetrievalState.Error) {
    return (
      <Grid>
        Error loading {gameId}: {game.error}
      </Grid>
    );
  }

  return <Grid>{gameId}</Grid>;
}
