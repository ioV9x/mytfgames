import { Kysely, sql, Transaction } from "kysely";

/**
 * Run migration logic in a transaction on a sqlite database.
 *
 * This function will disable foreign key checks, run the migration, and then
 * re-enable foreign key checks. This is necessary because sqlite does not offer
 * adequate ALTER TABLE support and does not support disabling foreign key
 * checks in a transaction.
 *
 * The any types reflect that the database is not in sync with the types of the
 * ORM as per the Kysely documentation.
 *
 * @param db - The database to run the migration on.
 * @param migration - The migration to run.
 */
export async function sqliteSafeMigration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: Kysely<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migration: (trx: Transaction<any>) => Promise<void>,
): Promise<void> {
  await sql`PRAGMA foreign_keys=0`.execute(db);
  try {
    await db.transaction().execute(migration);
  } finally {
    await sql`PRAGMA foreign_keys=1`.execute(db);
  }
}
