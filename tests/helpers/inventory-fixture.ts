export async function seed(db: { exec(sql: string): Promise<unknown> }, allocateVehicle = true) {
  await db.exec(`
    INSERT INTO "User" (id,name,phone,password,"updatedAt") VALUES (1,'Test operator','test-phone','test-only',NOW());
    INSERT INTO "Tour" (id,title,slug,"updatedAt") VALUES (1,'Test tour','test-tour',NOW());
    INSERT INTO "Departure" (id,"tourId","departureDate","updatedAt") VALUES
      (1,1,'2030-01-01',NOW()),(2,1,'2030-02-01',NOW());
    INSERT INTO "Booking" (id,"bookingNumber","departureId","customerId","totalAmount","updatedAt") VALUES
      (1,'TEST-1',1,1,1000,NOW()),(2,'TEST-2',2,1,2000,NOW());
    INSERT INTO "Passenger" (id,"bookingId",name,"passengerType","updatedAt") VALUES
      (1,1,'One','ADULT',NOW()),(2,1,'Two','ADULT',NOW()),(3,2,'Three','ADULT',NOW());
    INSERT INTO "SeatLayout" (id,name,"updatedAt") VALUES (1,'Test layout',NOW());
    INSERT INTO "Seat" (id,"seatLayoutId","seatNumber","updatedAt") VALUES (1,1,'A1',NOW()),(2,1,'A2',NOW());
    INSERT INTO "Vehicle" (id,name,type,"seatLayoutId","updatedAt") VALUES (1,'Test bus','BUS',1,NOW()),(2,'Other bus','BUS',1,NOW());
    INSERT INTO "SeatAssignment" (id,"passengerId","vehicleId","seatId","updatedAt") VALUES (1,1,1,1,NOW());
    INSERT INTO "Hotel" (id,name,location,"updatedAt") VALUES (1,'Test hotel','Test location',NOW()),(2,'Second hotel','Other location',NOW());
    INSERT INTO "Room" (id,"hotelId","roomNumber","roomType",capacity,"updatedAt") VALUES
      (1,1,'101','SHARED',4,NOW()),(2,1,'102','SHARED',4,NOW()),(3,2,'201','SHARED',4,NOW());
    INSERT INTO "HotelStay" (id,"departureId","hotelId","checkInDate","checkOutDate","updatedAt") VALUES
      (1,1,1,'2030-01-01','2030-01-02',NOW()),(2,1,2,'2030-01-02','2030-01-03',NOW());
    INSERT INTO "RoomAssignment" (id,"passengerId","hotelStayId","roomId","updatedAt") VALUES (1,1,1,1,NOW());
  `);
  await db.exec(`SELECT setval(pg_get_serial_sequence('"SeatAssignment"','id'),1); SELECT setval(pg_get_serial_sequence('"RoomAssignment"','id'),1); SELECT setval(pg_get_serial_sequence('"Tour"','id'),1);`);
  if (allocateVehicle) await db.exec(`INSERT INTO "DepartureVehicle" ("departureId","vehicleId","updatedAt") VALUES (1,1,NOW()),(2,1,NOW());`);
}

