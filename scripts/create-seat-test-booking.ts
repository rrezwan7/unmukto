import "dotenv/config";
import "temporal-polyfill/full/global";
import { randomBytes } from "node:crypto";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

if (
  process.env.ALLOW_DEVELOPMENT_FIXTURES !== "true" ||
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL
) {
  throw new Error("This script requires explicit development-fixture access.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL,
});

try {
  const result = await db.transaction(async (tx) => {
    const bookingNumber = "DEV-SEAT-TEST-1";

    const existing = await tx.orm.public.Booking
      .where({ bookingNumber })
      .first();

    if (existing) {
      return {
        message: "Test booking already exists; nothing changed.",
        bookingId: existing.id,
        bookingNumber,
      };
    }

    const departure = await tx.orm.public.Departure
      .where({ id: 1 })
      .first();

    if (!departure) {
      throw new Error("Departure 1 was not found.");
    }

    const pricing = await tx.orm.public.DeparturePricing
      .where({ departureId: 1 })
      .first();

    if (!pricing) {
      throw new Error("Save pricing for departure 1 first.");
    }

    // Calculate two adult fares exactly, without floating-point rounding.
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(pricing.adultFare);

    if (!match) {
      throw new Error("Adult fare must have at most two decimal places.");
    }

   const hundred = BigInt(100);

const fareInCents =
  BigInt(match[1]) * hundred +
  BigInt((match[2] ?? "").padEnd(2, "0"));

const totalInCents = fareInCents * BigInt(2);

const totalAmount =
  `${totalInCents / hundred}.` +
  (totalInCents % hundred).toString().padStart(2, "0");

    const customer = await tx.orm.public.User.create({
      name: "Development Seat Test Customer",
      phone: `DEV-${randomBytes(12).toString("hex")}`,
      // Disabled credential marker, not a usable customer password.
      password: `!disabled-${randomBytes(32).toString("hex")}`,
      role: "CUSTOMER",
    });

    const booking = await tx.orm.public.Booking.create({
      bookingNumber,
      departureId: 1,
      customerId: customer.id,
      status: "PENDING",
      totalAmount,
      paidAmount: "0",
      dueAmount: totalAmount,
      adultFareAtBooking: pricing.adultFare,
      childFareAtBooking: pricing.childFare,
      childFeeEnabledAtBooking: pricing.childFeeEnabled,
      roomSurchargeAtBooking: "0",
      notes: "Development fixture for seat-assignment testing.",
    });

    await tx.orm.public.Passenger.createAll([
      {
        bookingId: booking.id,
        name: "Test Adult One",
        passengerType: "ADULT",
      },
      {
        bookingId: booking.id,
        name: "Test Adult Two",
        passengerType: "ADULT",
      },
      {
        bookingId: booking.id,
        name: "Test Infant",
        passengerType: "INFANT",
      },
    ]);

    return {
      message: "Development test booking created.",
      bookingId: booking.id,
      bookingNumber,
      totalAmount,
    };
  });

  console.log(result);
} finally {
  await db.close();
}