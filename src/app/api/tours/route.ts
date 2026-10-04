import { db } from "@/prisma/db";

export async function GET() {
    const tours = await db.orm.public.Tour.all();

    return Response.json({
        success: true,
        tours,
    });
}

export async function POST(request: Request) {
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