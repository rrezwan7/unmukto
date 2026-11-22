import { checkAdminApi } from "@/lib/admin-auth";
import { parseHotel } from "@/lib/accommodation-input";

export async function GET() {
  const denied = await checkAdminApi();
  if (denied) return denied;

  try {
    const { db } = await import("@/prisma/db");

    const hotels = await db.orm.public.Hotel.all();
    hotels.sort((a, b) => a.name.localeCompare(b.name) || b.id - a.id);

    return Response.json(
      { success: true, hotels },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET HOTELS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load hotels." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const input = parseHotel(body);
  if (!input.hotel) return badRequest(input.error);

  try {
    const { db } = await import("@/prisma/db");
    const hotel = await db.orm.public.Hotel.create(input.hotel);
    return Response.json({ success: true, hotel }, { status: 201 });
  } catch (error) {
    console.error("CREATE HOTEL ERROR:", error);
    return Response.json({ success: false, error: "Unable to create hotel." }, { status: 500 });
  }
}
