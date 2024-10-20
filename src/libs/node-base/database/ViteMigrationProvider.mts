import { Migration, MigrationProvider } from "kysely";

export class ViteMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    // we need to await the import because it's a dynamic import which looses
    // its type information if we don't
    // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/return-await
    return await import.meta.glob("./migrations/*.mts", { eager: true });
  }
}
