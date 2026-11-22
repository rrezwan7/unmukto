import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import RoomForm from "./room-form";
import HotelForm from "../hotel-form";
import { isDatabaseId } from "@/lib/tour-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const roomTypeLabels: Record<string, string> = {
  SHARED: "Shared Room",
  COUPLE: "Couple Room",
  PRIVATE: "Private / Family Room",
};

export default async function HotelDetailPage({ params }: Props) {
  await requireAdminPage();

  const { id } = await params;
  const hotelId = Number(id);

  if (!isDatabaseId(hotelId)) {
    return <main className="p-6">Invalid hotel ID.</main>;
  }

  const { db } = await import("@/prisma/db");

  const hotel = await db.orm.public.Hotel
    .where({ id: hotelId })
    .first();

  if (!hotel) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold">Hotel not found</h1>
        <Link
          href="/admin/hotels"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          ← Back to Hotels
        </Link>
      </main>
    );
  }

  const rooms = await db.orm.public.Room
    .where({ hotelId })
    .all();

  rooms.sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }) ||
    a.id - b.id
  );

  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <Link
          href="/admin/hotels"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Hotels
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{hotel.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {hotel.location}
              {hotel.address ? ` · ${hotel.address}` : ""}
              {hotel.phone ? ` · Tel: ${hotel.phone}` : ""}
            </p>
          </div>

          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              hotel.isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {hotel.isActive ? "Active Hotel" : "Inactive Hotel"}
          </span>
        </div>

        {hotel.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {hotel.description}
          </p>
        )}

        <p className="mt-2 text-sm font-medium">
          {rooms.length} {rooms.length === 1 ? "room" : "rooms"} configured · Total capacity: {totalCapacity} passengers
        </p>
      </header>

      <HotelForm key={`hotel-${hotelId}`} hotel={hotel} />

      <RoomForm key={`room-${hotelId}`} hotelId={hotelId} />

      <Card>
        <CardHeader>
          <CardTitle>Configured Rooms</CardTitle>
          <CardDescription>
            Physical rooms available for departure stay assignments.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rooms added yet. Add rooms above to enable assignments.
            </p>
          ) : (
            <Table>
              <TableCaption>
                Room numbers must be unique within this hotel.
              </TableCaption>

              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Room Number</TableHead>
                  <TableHead scope="col">Room Type</TableHead>
                  <TableHead scope="col">Max Capacity</TableHead>
                  <TableHead scope="col">Description / Notes</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-semibold">
                      <Link href={`/admin/hotels/${hotelId}/rooms/${room.id}`} className="underline underline-offset-4">
                        Edit {room.roomNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {roomTypeLabels[room.roomType] ?? room.roomType}
                      </span>
                    </TableCell>
                    <TableCell>
                      {room.capacity} {room.capacity === 1 ? "person" : "persons"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {room.description ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
