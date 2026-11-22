#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5dff49b4929b91f943de2423466f22d947393fce55871fdf6b4a8cfa46200a77/contract';
import startContract from '../../snapshots/5dff49b4929b91f943de2423466f22d947393fce55871fdf6b4a8cfa46200a77/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e31033e7a2af52ac7a7fc4fec6df0b7f348118911c5e3d070044154db9494395/contract';
import endContract from '../../snapshots/e31033e7a2af52ac7a7fc4fec6df0b7f348118911c5e3d070044154db9494395/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ReservationRelease',
        columns: [
          col('adminGithubId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('bookingId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('releasedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['bookingId'])],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ReservationRelease',
        foreignKey: {
          name: 'ReservationRelease_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
