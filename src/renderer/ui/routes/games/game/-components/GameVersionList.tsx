import "index.scss";

import { ListItem, UnorderedList } from "@carbon/react";

import { GameVersion } from "$ipc/main-renderer";

export interface GameVersionListProps {
  versions: GameVersion[];
}
export function GameVersionList({ versions }: GameVersionListProps) {
  return (
    <UnorderedList>
      {versions.map(({ version, note, sources }) => (
        <ListItem key={version}>
          {version}
          {note !== "" && <> ({note})</>}
          <UnorderedList nested>
            {sources.map(({ uri, officialNote }) => (
              <ListItem key={uri}>
                {uri} ({officialNote})
              </ListItem>
            ))}
          </UnorderedList>
        </ListItem>
      ))}
    </UnorderedList>
  );
}
