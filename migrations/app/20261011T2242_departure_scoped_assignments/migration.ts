#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b994449b43086bb3399839222df75a80518abb8e182d5f4b10c683b03c96e1f2/contract';
import startContract from '../../snapshots/b994449b43086bb3399839222df75a80518abb8e182d5f4b10c683b03c96e1f2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c4fd7104ddd4f09f5554ead159f3fcd48993b669c5234ddba1f1cc27db7a8198/contract';
import endContract from '../../snapshots/c4fd7104ddd4f09f5554ead159f3fcd48993b669c5234ddba1f1cc27db7a8198/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const db = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'RoomAssignment',
        constraint: 'RoomAssignment_hotelStayId_roomId_passengerId_key',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'RoomAssignment',
        constraint: 'RoomAssignment_passengerId_key',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'SeatAssignment',
        constraint: 'SeatAssignment_vehicleId_seatId_key',
      }),
      this.addColumn({
        schema: 'public',
        table: 'SeatAssignment',
        column: col('departureId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dataTransform(db.contract, 'backfill-SeatAssignment-departureId', {
        check: () => db.sql.public.SeatAssignment.select('id').where((f, fns) => fns.eq(f.departureId, null)).limit(1).build(),
        // A passenger's booking identifies the departure; never guess from vehicle use.
        run: () => db.raw.sql`
          UPDATE public."SeatAssignment" AS assignment
          SET "departureId" = booking."departureId"
          FROM public."Passenger" AS passenger
          JOIN public."Booking" AS booking ON booking.id = passenger."bookingId"
          WHERE passenger.id = assignment."passengerId"
            AND assignment."departureId" IS NULL
        `.affectedCount().build(),
      }),
      this.setNotNull({ schema: 'public', table: 'SeatAssignment', column: 'departureId' }),
      this.addUnique({
        schema: 'public',
        table: 'RoomAssignment',
        constraint: 'RoomAssignment_passengerId_hotelStayId_key',
        columns: ['passengerId', 'hotelStayId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SeatAssignment',
        constraint: 'SeatAssignment_departureId_vehicleId_seatId_key',
        columns: ['departureId', 'vehicleId', 'seatId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoomAssignment',
        index: 'RoomAssignment_passengerId_idx_21958ace',
        columns: ['passengerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SeatAssignment',
        index: 'SeatAssignment_departureId_vehicleId_idx_3b46d2d1',
        columns: ['departureId', 'vehicleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SeatAssignment',
        foreignKey: {
          name: 'SeatAssignment_departureId_vehicleId_fkey',
          columns: ['departureId', 'vehicleId'],
          references: {
            schema: 'public',
            table: 'DepartureVehicle',
            columns: ['departureId', 'vehicleId'],
          },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
