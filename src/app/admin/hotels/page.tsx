import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import HotelForm from "./hotel-form";
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

export default async function HotelsPage() {
  await requireAdminPage();

  const { db } = await import("@/prisma/db");

  const [hotels, rooms] = await Promise.all([
    db.orm.public.Hotel.all(),
    db.orm.public.Room.all(),
  ]);

  hotels.sort((a, b) => a.name.localeCompare(b.name) || b.id - a.id);

  const roomCountByHotel = new Map<number, number>();
  for (const room of rooms) {
    roomCountByHotel.set(
      room.hotelId,
      (roomCountByHotel.get(room.hotelId) ?? 0) + 1
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <Link
          href="/admin/departures"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Departures
        </Link>

        <h1 className="mt-3 text-2xl font-bold">Hotels</h1>
        <p className="mt-1 text-muted-foreground">
          Manage partner hotels and their physical rooms for tour accommodations.
        </p>
      </header>

      <HotelForm />

      <Card>
        <CardHeader>
          <CardTitle>Registered Hotels</CardTitle>
          <CardDescription>
            {hotels.length} hotels registered. Open a hotel to edit its details and manage rooms.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {hotels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hotels yet. Register your first hotel partner above.
            </p>
          ) : (
            <Table>
              <TableCaption>
                Hotels and rooms available for departure stay assignments.
              </TableCaption>

              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Hotel Name</TableHead>
                  <TableHead scope="col">Location</TableHead>
                  <TableHead scope="col">Phone</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Rooms</TableHead>
                  <TableHead scope="col" className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {hotels.map((hotel) => {
                  const roomCount = roomCountByHotel.get(hotel.id) ?? 0;

                  return (
                    <TableRow key={hotel.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/hotels/${hotel.id}`}
                          className="hover:underline"
                        >
                          {hotel.name}
                        </Link>
                      </TableCell>
                      <TableCell>{hotel.location}</TableCell>
                      <TableCell>{hotel.phone ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            hotel.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {hotel.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {roomCount} {roomCount === 1 ? "room" : "rooms"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/hotels/${hotel.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Manage hotel →
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
