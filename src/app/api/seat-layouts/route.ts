import { checkAdminApi } from "@/lib/admin-auth";

export async function GET() {
  const denied = await checkAdminApi();
  if (denied) return denied;

  try {
    const { db } = await import("@/prisma/db");

    const layouts = await db.orm.public.SeatLayout.all();
    layouts.sort((a, b) => b.id - a.id);

    return Response.json(
      { success: true, layouts },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET SEAT LAYOUTS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load seat layouts." },
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
    return badRequest("Layout information is required.");
  }

  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.trim().length > 120
  ) {
    return badRequest("Provide a layout name of 1–120 characters.");
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

  try {
    const { db } = await import("@/prisma/db");

    const layout = await db.orm.public.SeatLayout.create({
      name: body.name.trim(),
      description: body.description?.trim() || null,
    });

    return Response.json(
      { success: true, layout },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE SEAT LAYOUT ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to create seat layout." },
      { status: 500 }
    );
  }
}