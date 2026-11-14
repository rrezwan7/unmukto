import { checkAdminApi } from "@/lib/admin-auth";

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

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Hotel information is required.");
  }

  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.trim().length > 150
  ) {
    return badRequest("Provide a hotel name of 1–150 characters.");
  }

  if (
    typeof body.location !== "string" ||
    !body.location.trim() ||
    body.location.trim().length > 150
  ) {
    return badRequest("Provide a location of 1–150 characters.");
  }

  if (
    body.address != null &&
    (typeof body.address !== "string" || body.address.length > 500)
  ) {
    return badRequest("Address must contain at most 500 characters.");
  }

  if (
    body.phone != null &&
    (typeof body.phone !== "string" || body.phone.length > 50)
  ) {
    return badRequest("Phone must contain at most 50 characters.");
  }

  if (
    body.description != null &&
    (typeof body.description !== "string" || body.description.length > 2000)
  ) {
    return badRequest("Description must contain at most 2,000 characters.");
  }

  if (typeof body.isActive !== "boolean") {
    return badRequest("Specify whether the hotel is active.");
  }

  try {
    const { db } = await import("@/prisma/db");

    const hotel = await db.orm.public.Hotel.create({
      name: body.name.trim(),
      location: body.location.trim(),
      address: body.address?.trim() || null,
      phone: body.phone?.trim() || null,
      description: body.description?.trim() || null,
      isActive: body.isActive,
    });

    return Response.json(
      { success: true, hotel },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE HOTEL ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to create hotel." },
      { status: 500 }
    );
  }
}
