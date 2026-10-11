import { checkAdminApi } from "@/lib/admin-auth";

export async function GET() {
    const denied = await checkAdminApi();
    if (denied) return denied;
    const { db } = await import("@/prisma/db");
    const tours = await db.orm.public.Tour.all();

    return Response.json({
        success: true,
        tours,
    });
}

export async function POST(request: Request) {
    const denied = await checkAdminApi(request);
    if (denied) return denied;
    const { db } = await import("@/prisma/db");
    const body = await request.json();

    const tour = await db.orm.public.Tour.create({
        title: body.title,
        slug: body.slug,
        description: body.description,
    });

    return Response.json(
        {
            success: true,
            tour,
        },
        { status: 201 }
    );
}