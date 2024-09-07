import "./GameVersionList.scss";

import {
  Accordion,
  AccordionItem,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from "@carbon/react";

import { GameVersion } from "$ipc/main-renderer";
import { ExternalLink } from "$renderer/components";

export interface GameVersionListProps {
  versions: GameVersion[];
}
export function GameVersionList({ versions }: GameVersionListProps) {
  return (
    <>
      <Accordion ordered className="games-game-version-list">
        {versions.map((version) => (
          <AccordionItem
            key={version.version}
            title={GameVersionTitle(version)}
          >
            {version.note !== "" && (
              <>
                <h4>Note</h4> <p>{version.note}</p>
              </>
            )}

            <h4>Artifacts</h4>
            <p>Not implemented.</p>

            <h4>Sources</h4>
            <StructuredListWrapper isCondensed isFlush>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Source Link</StructuredListCell>
                  <StructuredListCell head>Official Note</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {version.sources.map(({ uri, officialNote }) => (
                  <StructuredListRow key={uri}>
                    <StructuredListCell>
                      <ExternalLink href={uri}>
                        {new URL(uri).hostname}
                      </ExternalLink>
                    </StructuredListCell>
                    <StructuredListCell>
                      {officialNote === "" ? <i>N/A</i> : officialNote}
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}

const artifactQuantityConfig: QuantityConfig = {
  singular: "artifact",
  plural: "artifacts",
};
const sourceQuantityConfig: QuantityConfig = {
  singular: "source",
  plural: "sources",
};
function GameVersionTitle({ version, sources, artifacts }: GameVersion) {
  const sourcesQuantity = formatQuantity(sources.length, sourceQuantityConfig);
  const artifactQuantity = formatQuantity(
    artifacts.length,
    artifactQuantityConfig,
  );
  return (
    <>
      <h3>{version}</h3> ({sourcesQuantity}, {artifactQuantity})
    </>
  );
}

interface QuantityConfig {
  singular: string;
  plural: string;
}
function formatQuantity(
  quantity: number,
  { singular, plural }: QuantityConfig,
) {
  if (quantity < 1) {
    return `no ${plural}`;
  } else if (quantity === 1) {
    return `1 ${singular}`;
  } else {
    return `${quantity} ${plural}`;
  }
}
