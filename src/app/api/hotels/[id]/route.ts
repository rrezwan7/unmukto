import { checkAdminApi } from "@/lib/admin-auth";
import { lockHotel } from "@/lib/accommodation-editor";
import { parseHotel } from "@/lib/accommodation-input";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const fail = (error: string, status = 400) => Response.json({ success: false, error }, { status });
  const id = Number((await params).id);
  if (!isDatabaseId(id)) return fail("Invalid hotel ID.");

  const body: unknown = await request.json().catch(() => null);
  const input = parseHotel(body);
  if (!input.hotel) return fail(input.error);
  if (!isRecord(body) || typeof body.expectedUpdatedAt !== "string") {
    return fail("Reload the hotel before editing.");
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      if (!await lockHotel(tx, id)) return fail("Hotel not found.", 404);
      const { Hotel } = tx.orm.public;
      const current = await Hotel.where({ id }).first();
      if (current?.updatedAt !== body.expectedUpdatedAt) {
        return fail("This hotel changed since you opened it. Reload before saving again.", 409);
      }

      const hotel = await Hotel.where({ id }).update(input.hotel);
      return Response.json({ success: true, hotel });
    });
  } catch (error) {
    console.error("UPDATE HOTEL ERROR:", error);
    return fail("Unable to update hotel.", 500);
  }
}
