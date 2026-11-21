#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7129e5e6c1f3cc89d67400c4a466a019fd026cee2499dae2f163d833c326ea1f/contract';
import endContract from '../../snapshots/7129e5e6c1f3cc89d67400c4a466a019fd026cee2499dae2f163d833c326ea1f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c4fd7104ddd4f09f5554ead159f3fcd48993b669c5234ddba1f1cc27db7a8198/contract';
import startContract from '../../snapshots/c4fd7104ddd4f09f5554ead159f3fcd48993b669c5234ddba1f1cc27db7a8198/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BookingSettings',
        columns: [
          col('guestBookingEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('guestContactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('guestContactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('guestContactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('holdExpiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('reservationFingerprint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('reservationKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Booking', column: 'customerId' }),
      this.addUnique({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_reservationKey_key',
        columns: ['reservationKey'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
