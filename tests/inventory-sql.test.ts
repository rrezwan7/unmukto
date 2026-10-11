import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { seed } from "./helpers/inventory-fixture";

type Operation = {
  operationClass: string;
  precheck?: { sql: string; params?: unknown[] }[];
  execute: { sql: string; params?: unknown[] }[];
  postcheck?: { sql: string; params?: unknown[] }[];
};

async function apply(db: PGlite, migration: string) {
  // Execute the real emitted SQL, not a handwritten copy of the new constraints.
  const operations: Operation[] = JSON.parse(await readFile(`migrations/app/${migration}/ops.json`, "utf8"));
  await db.exec("BEGIN");
  try {
    for (const op of operations) {
      if (op.operationClass === "data" && op.precheck?.length) {
        const check = op.precheck[0];
        if (!(await db.query<{ ok: boolean }>(check.sql, check.params)).rows[0].ok) continue;
      }
      for (const query of op.execute) await db.query(query.sql, query.params);
      if (op.operationClass === "data") {
        for (const check of op.postcheck ?? []) assert((await db.query<{ ok: boolean }>(check.sql, check.params)).rows[0].ok);
      }
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

async function oldDatabase() {
  const db = await PGlite.create();
  await apply(db, "20261004T2132_baseline");
  await apply(db, "20261004T2133_pricing_and_room_options");
  return db;
}

test("emitted migration accepts an empty assignment database", async () => {
  const db = await oldDatabase();
  try {
    await apply(db, "20261011T2242_departure_scoped_assignments");
    const columns = await db.query<{ column_name: string; is_nullable: string }>(`SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='SeatAssignment' AND column_name='departureId'`);
    assert.equal(columns.rows[0].is_nullable, "NO");
  } finally { await db.close(); }
});

test("emitted SQL preserves assignments and enforces seat and hotel-stay scope", async () => {
  const db = await oldDatabase();
  try {
    await seed(db);
    await apply(db, "20261011T2242_departure_scoped_assignments");
    assert.equal((await db.query<{ departureId: number }>(`SELECT "departureId" FROM "SeatAssignment" WHERE id=1`)).rows[0].departureId, 1);
    assert.equal((await db.query<{ totalAmount: string }>(`SELECT "totalAmount" FROM "Booking" WHERE id=1`)).rows[0].totalAmount, "1000");
    await db.exec(`INSERT INTO "SeatAssignment" ("passengerId","departureId","vehicleId","seatId","updatedAt") VALUES (3,2,1,1,NOW());`);
    await assert.rejects(db.exec(`INSERT INTO "SeatAssignment" ("passengerId","departureId","vehicleId","seatId","updatedAt") VALUES (2,1,1,1,NOW());`), /duplicate key/i);
    await assert.rejects(db.exec(`INSERT INTO "SeatAssignment" ("passengerId","departureId","vehicleId","seatId","updatedAt") VALUES (2,1,2,2,NOW());`), /foreign key/i);
    await db.exec(`INSERT INTO "RoomAssignment" ("passengerId","hotelStayId","roomId","updatedAt") VALUES (1,2,3,NOW());`);
    await assert.rejects(db.exec(`INSERT INTO "RoomAssignment" ("passengerId","hotelStayId","roomId","updatedAt") VALUES (1,1,2,NOW());`), /duplicate key/i);
    assert.equal((await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM "RoomAssignment" WHERE "passengerId"=1`)).rows[0].count, 2);
  } finally { await db.close(); }
});

test("emitted SQL rolls back completely when an old assignment has no vehicle allocation", async () => {
  const db = await oldDatabase();
  try {
    await seed(db, false);
    await assert.rejects(apply(db, "20261011T2242_departure_scoped_assignments"), /foreign key/i);
    const columns = await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name='SeatAssignment'`);
    assert(!columns.rows.some((row) => row.column_name === "departureId"));
    assert.equal((await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM "SeatAssignment"`)).rows[0].count, 1);
  } finally { await db.close(); }
});
