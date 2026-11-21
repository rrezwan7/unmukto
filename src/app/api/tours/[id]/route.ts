import { checkAdminApi } from "@/lib/admin-auth";
import { tourCoverSource } from "@/lib/tour-cover";
import { isDatabaseId, isOptionalText, isRecord, lockTour } from "@/lib/tour-editor";
import { db } from "@/prisma/db";

export async function PATCH(request: Request, { params }: RouteContext<"/api/tours/[id]">) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;
  const id = Number((await params).id);
  const input: unknown = await request.json().catch(() => null);
  if (!isDatabaseId(id) || !isRecord(input)) {
    return Response.json({ error: "Valid tour details are required." }, { status: 400 });
  }

  const { title, description, coverImage, isActive, expectedUpdatedAt } = input;
  if (typeof title !== "string" || !title.trim() || !isOptionalText(description) ||
      !isOptionalText(coverImage) || typeof isActive !== "boolean" || typeof expectedUpdatedAt !== "string") {
    return Response.json({ error: "Enter a tour title and valid tour details." }, { status: 400 });
  }

  try {
    return await db.transaction(async (tx) => {
      if (!(await lockTour(tx, id))) return Response.json({ error: "Tour not found." }, { status: 404 });
      const current = await tx.orm.public.Tour.where({ id }).first();
      if (!current || current.updatedAt !== expectedUpdatedAt) {
        return Response.json({ error: "The tour changed since you opened it. Reload before saving again." }, { status: 409 });
      }

      const cover = coverImage?.trim() || null;
      if (cover && !tourCoverSource(cover) && cover !== current.coverImage) {
        return Response.json({ error: "Enter an HTTPS image URL or a local path that starts with /." }, { status: 400 });
      }

      const tour = await tx.orm.public.Tour.where({ id }).update({
        title: title.trim(),
        description: description?.trim() || null,
        coverImage: cover,
        isActive,
      });
      return Response.json({ tour });
    });
  } catch (error) {
    console.error("UPDATE TOUR ERROR:", error);
    return Response.json({ error: "Could not save the tour." }, { status: 500 });
  }
}
