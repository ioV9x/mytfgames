import type {
  JTDDataType,
  SomeJTDSchemaType,
  ValidateFunction,
} from "ajv/dist/jtd";

// TOC
// * game info front matter (aka game.md)
// * artifact metadata (aka artifact.yaml)
// * changelog front matter (aka changelogs/*.md)
//

////////////////////////////////////////////////////////////////////////////////
// game info front matter (aka game.md)
export const GameInfoFrontMatterTypeDefinition = {
  discriminator: "schema-version",
  mapping: {
    "0": {
      properties: {
        name: { type: "string" },
        synopsis: { type: "string" },
        ids: {
          properties: {
            uuid: { type: "string" },
          },
          optionalProperties: {
            "tfgames.site": { type: "int32", nullable: true },
          },
        },
        authors: {
          elements: {
            properties: {
              uuid: { type: "string" },
              name: { type: "string" },
              "metadata-version": { type: "int32" },
            },
            optionalProperties: {
              "tfgames.site": { type: "int32", nullable: true },
            },
          },
        },
        tags: {
          elements: { type: "string" },
        },
        "metadata-version": { type: "int32" },
      },
    },
  },
} as const satisfies SomeJTDSchemaType;
export type GameInfoFrontMatterType = JTDDataType<
  typeof GameInfoFrontMatterTypeDefinition
>;
export type GameInfoFrontMatterValidationFunction =
  ValidateFunction<GameInfoFrontMatterType>;

////////////////////////////////////////////////////////////////////////////////
// artifact metadata (aka artifact.yaml)
export const ArtifactMetadataTypeDefinition = {
  discriminator: "schema-version",
  mapping: {
    "0": {
      properties: {
        version: { type: "string" },
        platform: { type: "string" },
      },
    },
  },
} as const satisfies SomeJTDSchemaType;
export type ArtifactMetadataType = JTDDataType<
  typeof ArtifactMetadataTypeDefinition
>;
export type ArtifactMetadataValidationFunction =
  ValidateFunction<ArtifactMetadataType>;

////////////////////////////////////////////////////////////////////////////////
// changelog front matter (aka changelogs/*.md)
export const ChangelogFrontMatterTypeDefinition = {
  discriminator: "format-version",
  mapping: {
    "0": {
      properties: {},
    },
  },
} as const satisfies SomeJTDSchemaType;
export type ChangelogFrontMatterType = JTDDataType<
  typeof ChangelogFrontMatterTypeDefinition
>;
export type ChangelogFrontMatterValidationFunction =
  ValidateFunction<ChangelogFrontMatterType>;
