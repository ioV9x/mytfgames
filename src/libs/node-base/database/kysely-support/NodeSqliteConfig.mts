/*
The MIT License (MIT)

Copyright (c) 2022 Sami Koskimäki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import type { DatabaseSync } from "node:sqlite";

import type { DatabaseConnection } from "kysely";

/**
 * Config for the builtin nodejs SQLite dialect.
 */
export interface NodeSqliteDialectConfig {
  /**
   * An sqlite Database instance or a function that returns one.
   *
   * If a function is provided, it's called once when the first query is executed.
   *
   * https://nodejs.org/docs/latest-v22.x/api/sqlite.html#class-databasesync
   */
  database: DatabaseSync | (() => Promise<DatabaseSync>);

  /**
   * Called once when the first query is executed.
   *
   * This is a Kysely specific feature and does not come from the `better-sqlite3` module.
   */
  onCreateConnection?: (connection: DatabaseConnection) => Promise<void>;
}
