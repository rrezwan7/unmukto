import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string; stayId: string }>;
};

export async function DELETE(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id, stayId: stayIdParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayIdParam);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return badRequest("Invalid departure ID.");
  }

  if (!Number.isSafeInteger(stayId) || stayId <= 0) {
    return badRequest("Invalid stay ID.");
  }

  try {
    const { db } = await import("@/prisma/db");

    const stay = await db.orm.public.HotelStay
      .where({ id: stayId })
      .first();

    if (!stay || stay.departureId !== departureId) {
      return Response.json(
        { success: false, error: "Hotel stay not found on this departure." },
        { status: 404 }
      );
    }

    const assignments = await db.orm.public.RoomAssignment
      .where({ hotelStayId: stayId })
      .all();

    if (assignments.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Cannot remove hotel stay while ${assignments.length} passenger room assignment(s) exist. Unassign passengers first.`,
        },
        { status: 409 }
      );
    }

    await db.orm.public.HotelStay
      .where({ id: stayId })
      .delete();

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE HOTEL STAY ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to delete hotel stay." },
      { status: 500 }
    );
  }
}
