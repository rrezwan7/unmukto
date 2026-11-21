import { checkAdminApi } from "@/lib/admin-auth";
import { lockHotelStay } from "@/lib/reservation-inventory";

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

  if (!Number.isSafeInteger(departureId) || departureId <= 0 || departureId > 2_147_483_647) {
    return badRequest("Invalid departure ID.");
  }

  if (!Number.isSafeInteger(stayId) || stayId <= 0 || stayId > 2_147_483_647) {
    return badRequest("Invalid stay ID.");
  }

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      if (!(await lockHotelStay(tx, departureId, stayId))) {
        return Response.json(
          { success: false, error: "Hotel stay not found on this departure." },
          { status: 404 }
        );
      }

      const assignments = await tx.orm.public.RoomAssignment
        .where({ hotelStayId: stayId })
        .select("id")
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

      await tx.orm.public.HotelStay.where({ id: stayId }).delete();
      return Response.json({ success: true });
    });
  } catch (error) {
    console.error("DELETE HOTEL STAY ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to delete hotel stay." },
      { status: 500 }
    );
  }
}
