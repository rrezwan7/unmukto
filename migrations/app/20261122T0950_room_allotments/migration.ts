#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/bec5ab85ea67e7b0d71baeaa4d78cc385d194ddc5a602b7c435b404ee52abc63/contract';
import startContract from '../../snapshots/bec5ab85ea67e7b0d71baeaa4d78cc385d194ddc5a602b7c435b404ee52abc63/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fe60a6c70c033c5a9b8e15f2f57ef5366accdef77962c5d7ba2243f95660c928/contract';
import endContract from '../../snapshots/fe60a6c70c033c5a9b8e15f2f57ef5366accdef77962c5d7ba2243f95660c928/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'RoomAllotment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('hotelStayId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('places', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roomId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('RoomAllotment_places_range_55d67ee1', 'places BETWEEN 1 AND 20'),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RoomAllotment',
        constraint: 'RoomAllotment_hotelStayId_roomId_key',
        columns: ['hotelStayId', 'roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoomAllotment',
        index: 'RoomAllotment_hotelStayId_idx_05988de1',
        columns: ['hotelStayId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoomAllotment',
        index: 'RoomAllotment_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoomAssignment',
        index: 'RoomAssignment_roomId_hotelStayId_idx_fd7c6d81',
        columns: ['roomId', 'hotelStayId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoomAllotment',
        foreignKey: {
          name: 'RoomAllotment_hotelStayId_fkey',
          columns: ['hotelStayId'],
          references: { schema: 'public', table: 'HotelStay', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoomAllotment',
        foreignKey: {
          name: 'RoomAllotment_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'Room', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
