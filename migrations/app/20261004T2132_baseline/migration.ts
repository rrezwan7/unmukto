#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d4e19caa6ddd68060e2c298c481857362f18ac2b2b235d559718ad06106d864d/contract';
import endContract from '../../snapshots/d4e19caa6ddd68060e2c298c481857362f18ac2b2b235d559718ad06106d864d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'BlogCategory',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BlogPost',
        columns: [
          col('authorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('categoryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('coverImage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('excerpt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('publishedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('seoDescription', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('seoTitle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BlogPost_status_check_bc64f66b',
            "\"status\" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BlogPostTag',
        columns: [
          col('postId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tagId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['postId', 'tagId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BlogTag',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Booking',
        columns: [
          col('bookingNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('customerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('dueAmount', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('guideId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidAmount', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalAmount', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Booking_status_check_1c42d865',
            "\"status\" IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Departure',
        columns: [
          col('bookingOpen', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('customerVisible', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('departureDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('departureTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('returnDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('returnTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tourId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'DepartureVehicle',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('displayName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('displayOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vehicleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('visibleToCustomer', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Destination',
        columns: [
          col('arrivalTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departureTime', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('itineraryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Hotel',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('location', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'HotelStay',
        columns: [
          col('checkInDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('checkOutDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('destinationId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('hotelId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Itinerary',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dayNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tourId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Passenger',
        columns: [
          col('bookingId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dateOfBirth', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passengerType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Passenger_passengerType_check_89795c13',
            "\"passengerType\" IN ('ADULT', 'CHILD', 'INFANT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Payment',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('bookingId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('referenceNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transactionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Payment_method_check_7130ca56',
            "\"method\" IN ('BKASH', 'NAGAD', 'ROCKET', 'DBBL', 'CASH', 'BANK_TRANSFER', 'OTHER')",
          ),
          checkExpression(
            'Payment_status_check_8dbd8609',
            "\"status\" IN ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'PricingRule',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departureId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('passengerType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('roomType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'PricingRule_passengerType_check_89795c13',
            "\"passengerType\" IN ('ADULT', 'CHILD', 'INFANT')",
          ),
          checkExpression(
            'PricingRule_roomType_check_bbfda123',
            "\"roomType\" IN ('SHARED', 'COUPLE', 'PRIVATE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Room',
        columns: [
          col('capacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('hotelId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roomNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roomType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Room_roomType_check_bbfda123',
            "\"roomType\" IN ('SHARED', 'COUPLE', 'PRIVATE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'RoomAssignment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('hotelStayId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('passengerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roomId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Seat',
        columns: [
          col('columnNumber', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isAvailable', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('rowNumber', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('seatLayoutId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seatNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SeatAssignment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('passengerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seatId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vehicleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SeatLayout',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Tour',
        columns: [
          col('coverImage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('CUSTOMER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'User_role_check_8ecb417c',
            "\"role\" IN ('ADMIN', 'MODERATOR', 'CUSTOMER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Vehicle',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('registrationNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('seatLayoutId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Vehicle_type_check_4699ff10',
            "\"type\" IN ('BUS', 'COACH', 'MICROBUS', 'MINIBUS', 'OTHER')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BlogCategory',
        constraint: 'BlogCategory_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BlogPost',
        constraint: 'BlogPost_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BlogTag',
        constraint: 'BlogTag_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_bookingNumber_key',
        columns: ['bookingNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'DepartureVehicle',
        constraint: 'DepartureVehicle_departureId_vehicleId_key',
        columns: ['departureId', 'vehicleId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Itinerary',
        constraint: 'Itinerary_tourId_dayNumber_key',
        columns: ['tourId', 'dayNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Room',
        constraint: 'Room_hotelId_roomNumber_key',
        columns: ['hotelId', 'roomNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RoomAssignment',
        constraint: 'RoomAssignment_passengerId_key',
        columns: ['passengerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RoomAssignment',
        constraint: 'RoomAssignment_hotelStayId_roomId_passengerId_key',
        columns: ['hotelStayId', 'roomId', 'passengerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Seat',
        constraint: 'Seat_seatLayoutId_seatNumber_key',
        columns: ['seatLayoutId', 'seatNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SeatAssignment',
        constraint: 'SeatAssignment_passengerId_key',
        columns: ['passengerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SeatAssignment',
        constraint: 'SeatAssignment_vehicleId_seatId_key',
        columns: ['vehicleId', 'seatId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Tour',
        constraint: 'Tour_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_phone_key',
        columns: ['phone'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Vehicle',
        constraint: 'Vehicle_registrationNumber_key',
        columns: ['registrationNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogPost',
        index: 'BlogPost_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogPost',
        index: 'BlogPost_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogPost',
        index: 'BlogPost_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogPostTag',
        index: 'BlogPostTag_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BlogPostTag',
        index: 'BlogPostTag_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_departureId_idx_24d39b35',
        columns: ['departureId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_guideId_idx_d17d3b18',
        columns: ['guideId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Departure',
        index: 'Departure_tourId_idx_5405fc10',
        columns: ['tourId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DepartureVehicle',
        index: 'DepartureVehicle_departureId_idx_24d39b35',
        columns: ['departureId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DepartureVehicle',
        index: 'DepartureVehicle_vehicleId_idx_e2df58fc',
        columns: ['vehicleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Destination',
        index: 'Destination_itineraryId_idx_eaa1b547',
        columns: ['itineraryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HotelStay',
        index: 'HotelStay_departureId_idx_24d39b35',
        columns: ['departureId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HotelStay',
        index: 'HotelStay_destinationId_idx_1646ee5c',
        columns: ['destinationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'HotelStay',
        index: 'HotelStay_hotelId_idx_462a16a4',
        columns: ['hotelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Itinerary',
        index: 'Itinerary_tourId_idx_5405fc10',
        columns: ['tourId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Passenger',
        index: 'Passenger_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PricingRule',
        index: 'PricingRule_departureId_idx_24d39b35',
        columns: ['departureId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Room',
        index: 'Room_hotelId_idx_462a16a4',
        columns: ['hotelId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoomAssignment',
        index: 'RoomAssignment_hotelStayId_idx_05988de1',
        columns: ['hotelStayId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoomAssignment',
        index: 'RoomAssignment_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Seat',
        index: 'Seat_seatLayoutId_idx_cc499d6c',
        columns: ['seatLayoutId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SeatAssignment',
        index: 'SeatAssignment_seatId_idx_3076c3cd',
        columns: ['seatId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SeatAssignment',
        index: 'SeatAssignment_vehicleId_idx_e2df58fc',
        columns: ['vehicleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Vehicle',
        index: 'Vehicle_seatLayoutId_idx_cc499d6c',
        columns: ['seatLayoutId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogPost',
        foreignKey: {
          name: 'BlogPost_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogPost',
        foreignKey: {
          name: 'BlogPost_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'BlogCategory', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogPostTag',
        foreignKey: {
          name: 'BlogPostTag_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'BlogPost', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BlogPostTag',
        foreignKey: {
          name: 'BlogPostTag_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'BlogTag', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_guideId_fkey',
          columns: ['guideId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Departure',
        foreignKey: {
          name: 'Departure_tourId_fkey',
          columns: ['tourId'],
          references: { schema: 'public', table: 'Tour', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DepartureVehicle',
        foreignKey: {
          name: 'DepartureVehicle_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DepartureVehicle',
        foreignKey: {
          name: 'DepartureVehicle_vehicleId_fkey',
          columns: ['vehicleId'],
          references: { schema: 'public', table: 'Vehicle', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Destination',
        foreignKey: {
          name: 'Destination_itineraryId_fkey',
          columns: ['itineraryId'],
          references: { schema: 'public', table: 'Itinerary', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HotelStay',
        foreignKey: {
          name: 'HotelStay_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HotelStay',
        foreignKey: {
          name: 'HotelStay_hotelId_fkey',
          columns: ['hotelId'],
          references: { schema: 'public', table: 'Hotel', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'HotelStay',
        foreignKey: {
          name: 'HotelStay_destinationId_fkey',
          columns: ['destinationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Itinerary',
        foreignKey: {
          name: 'Itinerary_tourId_fkey',
          columns: ['tourId'],
          references: { schema: 'public', table: 'Tour', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Passenger',
        foreignKey: {
          name: 'Passenger_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PricingRule',
        foreignKey: {
          name: 'PricingRule_departureId_fkey',
          columns: ['departureId'],
          references: { schema: 'public', table: 'Departure', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Room',
        foreignKey: {
          name: 'Room_hotelId_fkey',
          columns: ['hotelId'],
          references: { schema: 'public', table: 'Hotel', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoomAssignment',
        foreignKey: {
          name: 'RoomAssignment_passengerId_fkey',
          columns: ['passengerId'],
          references: { schema: 'public', table: 'Passenger', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoomAssignment',
        foreignKey: {
          name: 'RoomAssignment_hotelStayId_fkey',
          columns: ['hotelStayId'],
          references: { schema: 'public', table: 'HotelStay', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoomAssignment',
        foreignKey: {
          name: 'RoomAssignment_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'Room', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Seat',
        foreignKey: {
          name: 'Seat_seatLayoutId_fkey',
          columns: ['seatLayoutId'],
          references: { schema: 'public', table: 'SeatLayout', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SeatAssignment',
        foreignKey: {
          name: 'SeatAssignment_passengerId_fkey',
          columns: ['passengerId'],
          references: { schema: 'public', table: 'Passenger', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SeatAssignment',
        foreignKey: {
          name: 'SeatAssignment_vehicleId_fkey',
          columns: ['vehicleId'],
          references: { schema: 'public', table: 'Vehicle', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SeatAssignment',
        foreignKey: {
          name: 'SeatAssignment_seatId_fkey',
          columns: ['seatId'],
          references: { schema: 'public', table: 'Seat', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Vehicle',
        foreignKey: {
          name: 'Vehicle_seatLayoutId_fkey',
          columns: ['seatLayoutId'],
          references: { schema: 'public', table: 'SeatLayout', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
