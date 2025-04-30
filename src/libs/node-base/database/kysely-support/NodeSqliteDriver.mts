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

import type {
  DatabaseSync,
  SQLInputValue,
  SQLOutputValue,
  StatementSync,
} from "node:sqlite";

import {
  CompiledQuery,
  createQueryId,
  DatabaseConnection,
  DeleteQueryNode,
  Driver,
  IdentifierNode,
  InsertQueryNode,
  MergeQueryNode,
  QueryCompiler,
  QueryResult,
  RawNode,
  SelectQueryNode,
  UpdateQueryNode,
} from "kysely";

import { NodeSqliteDialectConfig } from "./NodeSqliteConfig.mjs";

export class NodeSqliteDriver implements Driver {
  readonly #config: NodeSqliteDialectConfig;
  readonly #connectionMutex = new ConnectionMutex();

  #db?: DatabaseSync;
  #connection?: DatabaseConnection;

  constructor(config: NodeSqliteDialectConfig) {
    this.#config = Object.freeze({ ...config });
  }

  async init(): Promise<void> {
    this.#db =
      typeof this.#config.database === "function"
        ? await this.#config.database()
        : this.#config.database;

    this.#connection = new NodeSqliteConnection(this.#db);

    if (this.#config.onCreateConnection) {
      await this.#config.onCreateConnection(this.#connection);
    }
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    // SQLite only has one single connection. We use a mutex here to wait
    // until the single connection has been released.
    await this.#connectionMutex.lock();
    return this.#connection!;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("begin"));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("commit"));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("rollback"));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async releaseConnection(): Promise<void> {
    this.#connectionMutex.unlock();
  }

  async savepoint(
    connection: DatabaseConnection,
    savepointName: string,
    compileQuery: QueryCompiler["compileQuery"],
  ): Promise<void> {
    await connection.executeQuery(
      compileQuery(
        parseSavepointCommand("savepoint", savepointName),
        createQueryId(),
      ),
    );
  }

  async rollbackToSavepoint(
    connection: DatabaseConnection,
    savepointName: string,
    compileQuery: QueryCompiler["compileQuery"],
  ): Promise<void> {
    await connection.executeQuery(
      compileQuery(
        parseSavepointCommand("rollback to", savepointName),
        createQueryId(),
      ),
    );
  }

  async releaseSavepoint(
    connection: DatabaseConnection,
    savepointName: string,
    compileQuery: QueryCompiler["compileQuery"],
  ): Promise<void> {
    await connection.executeQuery(
      compileQuery(
        parseSavepointCommand("release", savepointName),
        createQueryId(),
      ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async destroy(): Promise<void> {
    this.#db?.close();
  }
}

class NodeSqliteConnection implements DatabaseConnection {
  readonly #db: DatabaseSync;
  readonly #selectOneStatementCache: StatementSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
    this.#selectOneStatementCache = db.prepare("select 1");
  }

  executeQuery<O>({
    sql,
    parameters,
    query,
  }: CompiledQuery): Promise<QueryResult<O>> {
    const stmt = this.#db.prepare(sql);

    if (SelectQueryNode.is(query)) {
      return Promise.resolve({
        rows: stmt.all(...(parameters as SQLInputValue[])) as O[],
      });
    }
    const isInsert = InsertQueryNode.is(query);
    if (
      isInsert ||
      UpdateQueryNode.is(query) ||
      DeleteQueryNode.is(query) ||
      MergeQueryNode.is(query)
    ) {
      const rows = stmt.all(...(parameters as SQLOutputValue[])) as O[];
      const { changes, lastInsertRowid } = this.#selectOneStatementCache.run();
      return Promise.resolve({
        rows,
        numAffectedRows: BigInt(changes),
        ...(isInsert ? { insertId: BigInt(lastInsertRowid) } : {}),
      });
    }
    stmt.run(...(parameters as SQLInputValue[]));
    return Promise.resolve({ rows: [] });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *streamQuery<R>(
    { sql, parameters, query }: CompiledQuery,
    _chunkSize: number,
  ): AsyncIterableIterator<QueryResult<R>> {
    if (!SelectQueryNode.is(query)) {
      throw new Error(
        "Sqlite driver only supports streaming of select queries",
      );
    }

    const stmt = this.#db.prepare(sql);
    const iter = stmt.iterate(
      ...(parameters as SQLInputValue[]),
    ) as Iterable<R>;
    for (const row of iter) {
      yield {
        rows: [row],
      };
    }
  }
}

function parseSavepointCommand(
  command: string,
  savepointName: string,
): RawNode {
  return RawNode.createWithChildren([
    RawNode.createWithSql(`${command} `),
    IdentifierNode.create(savepointName), // ensures savepointName gets sanitized
  ]);
}

class ConnectionMutex {
  #promise: Promise<void> | undefined;
  #resolve: (() => void) | undefined;

  async lock(): Promise<void> {
    while (this.#promise) {
      await this.#promise;
    }

    this.#promise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  unlock(): void {
    const resolve = this.#resolve;

    this.#promise = undefined;
    this.#resolve = undefined;

    resolve?.();
  }
}
