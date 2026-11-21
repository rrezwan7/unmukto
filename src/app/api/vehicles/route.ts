import { checkAdminApi } from "@/lib/admin-auth";

export async function GET() {
  const denied = await checkAdminApi();
  if (denied) return denied;

  try {
    const { db } = await import("@/prisma/db");

    const vehicles = await db.orm.public.Vehicle.all();
    vehicles.sort((a, b) => b.id - a.id);

    return Response.json(
      { success: true, vehicles },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET VEHICLES ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load vehicles." },
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
    return badRequest("Vehicle information is required.");
  }

  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.trim().length > 120
  ) {
    return badRequest("Provide a vehicle name of 1–120 characters.");
  }

  const type = body.type;

  if (
    type !== "BUS" &&
    type !== "COACH" &&
    type !== "MICROBUS" &&
    type !== "MINIBUS" &&
    type !== "OTHER"
  ) {
    return badRequest("Choose a valid vehicle type.");
  }

  if (
    body.registrationNumber != null &&
    (typeof body.registrationNumber !== "string" ||
      body.registrationNumber.trim().length > 100)
  ) {
    return badRequest(
      "Registration number must contain at most 100 characters."
    );
  }

  if (
    body.description != null &&
    (typeof body.description !== "string" ||
      body.description.length > 2000)
  ) {
    return badRequest(
      "Description must contain at most 2,000 characters."
    );
  }

  if (typeof body.isActive !== "boolean") {
    return badRequest("Specify whether the vehicle is active.");
  }

  const registrationNumber =
    body.registrationNumber?.trim().toUpperCase() || null;
  const description = body.description?.trim() || null;

  try {
    const { db } = await import("@/prisma/db");

    if (registrationNumber) {
      const existing = await db.orm.public.Vehicle
        .where({ registrationNumber })
        .first();

      if (existing) {
        return Response.json(
          {
            success: false,
            error: "A vehicle with this registration number already exists.",
          },
          { status: 409 }
        );
      }
    }

    const vehicle = await db.orm.public.Vehicle.create({
      name: body.name.trim(),
      type,
      registrationNumber,
      description,
      isActive: body.isActive,
    });

    return Response.json(
      { success: true, vehicle },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE VEHICLE ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to create vehicle." },
      { status: 500 }
    );
  }
}