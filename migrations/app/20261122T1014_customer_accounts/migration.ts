#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5dff49b4929b91f943de2423466f22d947393fce55871fdf6b4a8cfa46200a77/contract';
import endContract from '../../snapshots/5dff49b4929b91f943de2423466f22d947393fce55871fdf6b4a8cfa46200a77/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fe60a6c70c033c5a9b8e15f2f57ef5366accdef77962c5d7ba2243f95660c928/contract';
import startContract from '../../snapshots/fe60a6c70c033c5a9b8e15f2f57ef5366accdef77962c5d7ba2243f95660c928/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CustomerAccount',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('googleSubject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CustomerBooking',
        columns: [
          col('bookingId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('customerAccountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['bookingId'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CustomerAccount',
        constraint: 'CustomerAccount_googleSubject_key',
        columns: ['googleSubject'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerBooking',
        index: 'CustomerBooking_customerAccountId_idx_24c06369',
        columns: ['customerAccountId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerBooking',
        foreignKey: {
          name: 'CustomerBooking_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerBooking',
        foreignKey: {
          name: 'CustomerBooking_customerAccountId_fkey',
          columns: ['customerAccountId'],
          references: { schema: 'public', table: 'CustomerAccount', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
