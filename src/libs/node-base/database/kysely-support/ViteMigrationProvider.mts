import path from "node:path/posix";

import { Migration, MigrationProvider } from "kysely";

export class ViteMigrationProvider implements MigrationProvider {
  getMigrations(): Promise<Record<string, Migration>> {
    const migrationModuleMap = this.#getMigrationsGlob();
    const migrationModuleEntries = Object.entries(migrationModuleMap);
    const migrations = Object.fromEntries(
      migrationModuleEntries.map(([modulePath, migration]) => [
        path.basename(modulePath, ".mts"),
        migration,
      ]),
    );

    return Promise.resolve(migrations);
  }

  #getMigrationsGlob(): Record<string, Migration> {
    try {
      return import.meta.glob("../migrations/*.mts", { eager: true });
    } catch (error) {
      throw new Error("Failed to load migration modules", {
        cause: error,
      });
    }
  }
}
