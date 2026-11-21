#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7129e5e6c1f3cc89d67400c4a466a019fd026cee2499dae2f163d833c326ea1f/contract';
import startContract from '../../snapshots/7129e5e6c1f3cc89d67400c4a466a019fd026cee2499dae2f163d833c326ea1f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/aa9da8cd535ad5fc35bfd81cb9cd2a7957ef6f1928a489326ea6430e71d1e71c/contract';
import endContract from '../../snapshots/aa9da8cd535ad5fc35bfd81cb9cd2a7957ef6f1928a489326ea6430e71d1e71c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('confirmedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('confirmedByGithubId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('manualVerificationKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_manualVerificationKey_key',
        columns: ['manualVerificationKey'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
