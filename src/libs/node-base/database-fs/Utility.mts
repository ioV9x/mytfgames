import { AppConfiguration } from "$node-base/configuration";

export function dbfsHashToBlobPath(value: Buffer): string {
  const hash = value.toString("hex");
  return `${hash.slice(0, 3)}/${hash.slice(3, 6)}/${hash}`;
}
export function dbfsHashToFullBlobPath(
  configuration: AppConfiguration,
  value: Buffer,
): string {
  return `${configuration.root.paths.blob_store}/${dbfsHashToBlobPath(value)}`;
}
