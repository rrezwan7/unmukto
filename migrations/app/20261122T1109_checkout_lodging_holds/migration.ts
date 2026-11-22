#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d63a13a97806a73b0d952fc1812e338017cfb9d9972199ea665cedd6980b2698/contract';
import endContract from '../../snapshots/d63a13a97806a73b0d952fc1812e338017cfb9d9972199ea665cedd6980b2698/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e31033e7a2af52ac7a7fc4fec6df0b7f348118911c5e3d070044154db9494395/contract';
import startContract from '../../snapshots/e31033e7a2af52ac7a7fc4fec6df0b7f348118911c5e3d070044154db9494395/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BookingRoomHold',
        columns: [
          col('bookingId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('hotelStayId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('places', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roomId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('BookingRoomHold_places_range_55d67ee1', 'places BETWEEN 1 AND 20'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'DepartureLodgingSettings',
        columns: [
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('holdsEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['departureId'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BookingRoomHold',
        constraint: 'BookingRoomHold_bookingId_hotelStayId_roomId_key',
        columns: ['bookingId', 'hotelStayId', 'roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingRoomHold',
        index: 'BookingRoomHold_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingRoomHold',
        index: 'BookingRoomHold_hotelStayId_idx_05988de1',
        columns: ['hotelStayId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BookingRoomHold',
        index: 'BookingRoomHold_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingRoomHold',
        foreignKey: {
          name: 'BookingRoomHold_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingRoomHold',
        foreignKey: {
          name: 'BookingRoomHold_hotelStayId_fkey',
          columns: ['hotelStayId'],
          references: { schema: 'public', table: 'HotelStay', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BookingRoomHold',
        foreignKey: {
          name: 'BookingRoomHold_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'Room', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DepartureLodgingSettings',
        foreignKey: {
          name: 'DepartureLodgingSettings_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
