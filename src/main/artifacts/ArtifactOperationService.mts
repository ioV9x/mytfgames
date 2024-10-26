import { GameId } from "$node-base/database";
import { makeServiceIdentifier } from "$node-base/utils";

const ArtifactOperationService = makeServiceIdentifier(
  "artifact-operation-service",
);
interface ArtifactOperationService {
  createArtifactPlaceholder(
    gameId: GameId,
    version: string,
    platform: string,
  ): Promise<bigint>;
  replaceArtifactPlaceholder(
    gameId: GameId,
    version: string,
    platform: string,
    nodeNo: bigint,
  ): Promise<void>;

  deleteArtifact(
    gameId: GameId,
    version: string,
    platform: string,
  ): Promise<bigint>;
}
export { ArtifactOperationService };
