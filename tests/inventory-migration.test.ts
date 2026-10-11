import assert from "node:assert/strict";
import { seed } from "./helpers/inventory-fixture";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { Client, type QueryResultRow } from "pg";
import "temporal-polyfill/full/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contract from "../src/prisma/contract.json" with { type: "json" };

const exec = promisify(execFile);
const previous = "b994449b43086bb3399839222df75a80518abb8e182d5f4b10c683b03c96e1f2";

const adminUrl = process.env.TEST_DATABASE_URL;
const options = { timeout: 120000, skip: !adminUrl };

class TestDatabase {
  constructor(private readonly url: string) {}
  async query<T extends QueryResultRow = QueryResultRow>(sql: string) {
    const client = new Client({ connectionString: this.url });
    await client.connect();
    try { return await client.query<T>(sql); }
    finally { await client.end(); }
  }
  async exec(sql: string) { await this.query(sql); }
}

async function withDatabase(run: (db: TestDatabase, url: string) => Promise<void>) {
  // Never use DATABASE_URL. Only connect when a local test admin URL is explicit.
  const base = new URL(adminUrl!);
  assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "TEST_DATABASE_URL must point to a local test server");
  const name = `unmukto_inventory_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    base.pathname = `/${name}`;
    const url = base.toString();
    await run(new TestDatabase(url), url);
  } finally {
    // Drop only this test's generated database, never the configured admin database.
    await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()", [name]);
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
    await admin.end();
  }
}

async function migrate(url: string, to?: string) {
  const args = ["node_modules/prisma/dist/prisma.js", "db", "migrate", "--db", url];
  if (to) args.push("--to", to);
  try {
    return await exec(process.execPath, args, {
      env: { ...process.env, DATABASE_URL: url, PRISMA_DISABLE_TELEMETRY: "1" },
      timeout: 60000, maxBuffer: 4 * 1024 * 1024,
    });
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`Disposable migration failed: ${(failure.stdout ?? "").replaceAll(url, "[local test database]")}\n${(failure.stderr ?? "").replaceAll(url, "[local test database]")}`);
  }
}


test("assignment migration preserves data and enforces departure/stay scope", options, async () => {
  await withDatabase(async (db, url) => {
    await migrate(url, previous);
    await seed(db);
    await migrate(url);
    assert.equal((await db.query<{ departureId: number }>(`SELECT "departureId" FROM "SeatAssignment" WHERE id=1`)).rows[0].departureId, 1);
    assert.equal((await db.query<{ totalAmount: string }>(`SELECT "totalAmount" FROM "Booking" WHERE id=1`)).rows[0].totalAmount, "1000");
    // One physical seat may be reused on another departure.
    await db.exec(`INSERT INTO "SeatAssignment" ("passengerId","departureId","vehicleId","seatId","updatedAt") VALUES (3,2,1,1,NOW());`);
    await assert.rejects(db.exec(`INSERT INTO "SeatAssignment" ("passengerId","departureId","vehicleId","seatId","updatedAt") VALUES (2,1,1,1,NOW());`), /duplicate key/i);
    // A vehicle must be allocated to the selected departure.
    await assert.rejects(db.exec(`INSERT INTO "SeatAssignment" ("passengerId","departureId","vehicleId","seatId","updatedAt") VALUES (2,1,2,2,NOW());`), /foreign key/i);
    // One passenger can be allocated a room for both hotel stays.
    await db.exec(`INSERT INTO "RoomAssignment" ("passengerId","hotelStayId","roomId","updatedAt") VALUES (1,2,3,NOW());`);
    await assert.rejects(db.exec(`INSERT INTO "RoomAssignment" ("passengerId","hotelStayId","roomId","updatedAt") VALUES (1,1,2,NOW());`), /duplicate key/i);
    const client = postgres<Contract>({ contractJson: contract, url });
    try {
      const passenger = await client.orm.public.Passenger.where((p) => p.id.eq(1)).include("roomAssignments").first();
      assert.equal(passenger?.roomAssignments.length, 2);
      // Verify the actual installed Prisma transaction API, including rollback.
      await assert.rejects(client.transaction(async (tx) => {
        await tx.orm.public.Tour.create({ title: "Rollback tour", slug: "rollback-tour" });
        throw new Error("intentional rollback");
      }), /intentional rollback/);
      assert.equal(await client.orm.public.Tour.where((t) => t.slug.eq("rollback-tour")).first(), null);
    } finally { await client.close(); }
    // Reapplying is a no-op rather than duplicating or removing data.
    await migrate(url);
    assert.equal((await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM "SeatAssignment"`)).rows[0].count, 2);
  });
});

test("inconsistent old vehicle assignments abort migration without data loss", options, async () => {
  await withDatabase(async (db, url) => {
    await migrate(url, previous);
    await seed(db, false);
    await assert.rejects(migrate(url), /foreign key/i);
    assert.equal((await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM "SeatAssignment"`)).rows[0].count, 1);
    const columns = await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name='SeatAssignment'`);
    assert(!columns.rows.some((row) => row.column_name === "departureId"));
  });
});
