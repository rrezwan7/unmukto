import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-auth";
import { isDatabaseId } from "@/lib/tour-editor";
import RoomForm from "../../room-form";

type Props = { params: Promise<{ id: string; roomId: string }> };

export default async function EditRoomPage({ params }: Props) {
  await requireAdminPage();
  const { id, roomId: roomParam } = await params;
  const hotelId = Number(id);
  const roomId = Number(roomParam);
  if (!isDatabaseId(hotelId) || !isDatabaseId(roomId)) notFound();

  const { db } = await import("@/prisma/db");
  const room = await db.orm.public.Room.where({ id: roomId, hotelId })
    .include("hotel", (hotel) => hotel.select("name")).first();
  if (!room?.hotel) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <Link href={`/admin/hotels/${hotelId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {room.hotel.name}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Room {room.roomNumber}</h1>
      </header>
      <RoomForm key={roomId} hotelId={hotelId} room={room} />
    </main>
  );
}
