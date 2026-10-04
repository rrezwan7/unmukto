import { db } from "@/prisma/db";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const tour = await db.orm.public.Tour.update({
        id: Number(id),
        title: body.title,
        slug: body.slug,
        description: body.description,
    });

    return Response.json({
        success: true,
        tour,
    });
}