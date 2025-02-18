import fs from "node:fs";
import path from "node:path";

import { MakerBase, MakerOptions } from "@electron-forge/maker-base";
import { ForgePlatform } from "@electron-forge/shared-types";

export interface MakerPortableZipConfig {
  embeddedConfiguration: string;
}

export class MakerPortableZip extends MakerBase<MakerPortableZipConfig> {
  name = "portable-zip";

  defaultPlatforms: ForgePlatform[] = ["darwin", "win32", "linux"];

  override isSupportedOnCurrentPlatform(): boolean {
    return true;
  }

  override async make({
    appName,
    dir,
    makeDir,
    packageJSON,
    targetArch,
    targetPlatform,
  }: MakerOptions): Promise<string[]> {
    const archiver = await import("archiver");

    const packageDirectory =
      targetPlatform === "darwin" ? path.resolve(dir, `${appName}.app`) : dir;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const artifact = `${path.basename(dir)}-${packageJSON.version}-portable.zip`;
    const outputPath = path.resolve(
      makeDir,
      "zip",
      targetPlatform,
      targetArch,
      artifact,
    );

    await this.ensureFile(outputPath);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver.default("zip", {
      zlib: { level: 9 },
    });

    await new Promise<void>((resolve, reject) => {
      archive.on("error", reject);
      // eslint-disable-next-line no-console
      archive.on("warning", console.warn);

      archive.pipe(output);

      archive.file(this.config.embeddedConfiguration, {
        name: "configuration.toml",
      });
      archive.directory(packageDirectory, false);

      archive.finalize().then(resolve, reject);
    });
    return [outputPath];
  }
}
