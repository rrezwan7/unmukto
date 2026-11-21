#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/aa9da8cd535ad5fc35bfd81cb9cd2a7957ef6f1928a489326ea6430e71d1e71c/contract';
import startContract from '../../snapshots/aa9da8cd535ad5fc35bfd81cb9cd2a7957ef6f1928a489326ea6430e71d1e71c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bec5ab85ea67e7b0d71baeaa4d78cc385d194ddc5a602b7c435b404ee52abc63/contract';
import endContract from '../../snapshots/bec5ab85ea67e7b0d71baeaa4d78cc385d194ddc5a602b7c435b404ee52abc63/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Destination',
        column: col('displayOrder', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
