#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b994449b43086bb3399839222df75a80518abb8e182d5f4b10c683b03c96e1f2/contract';
import endContract from '../../snapshots/b994449b43086bb3399839222df75a80518abb8e182d5f4b10c683b03c96e1f2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4e19caa6ddd68060e2c298c481857362f18ac2b2b235d559718ad06106d864d/contract';
import startContract from '../../snapshots/d4e19caa6ddd68060e2c298c481857362f18ac2b2b235d559718ad06106d864d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'PricingRule' }),
      this.createTable({
        schema: 'public',
        table: 'DeparturePricing',
        columns: [
          col('adultFare', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('childFare', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('childFeeEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'DepartureRoomOption',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('displayOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isAvailable', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('maxAdults', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('maxChildren', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('maxOccupants', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('roomType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('surcharge', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'DepartureRoomOption_roomType_check_bbfda123',
            "\"roomType\" IN ('SHARED', 'COUPLE', 'PRIVATE')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('adultFareAtBooking', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('childFareAtBooking', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('childFeeEnabledAtBooking', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('roomOptionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('roomSurchargeAtBooking', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'Booking',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.addUnique({
        schema: 'public',
        table: 'DeparturePricing',
        constraint: 'DeparturePricing_departureId_key',
        columns: ['departureId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'DepartureRoomOption',
        constraint: 'DepartureRoomOption_departureId_roomType_key',
        columns: ['departureId', 'roomType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_roomOptionId_idx_114aad0b',
        columns: ['roomOptionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DepartureRoomOption',
        index: 'DepartureRoomOption_departureId_idx_24d39b35',
        columns: ['departureId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DeparturePricing',
        foreignKey: {
          name: 'DeparturePricing_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DepartureRoomOption',
        foreignKey: {
          name: 'DepartureRoomOption_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_roomOptionId_fkey',
          columns: ['roomOptionId'],
          references: { schema: 'public', table: 'DepartureRoomOption', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
