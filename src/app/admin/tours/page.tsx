import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";

export default async function ToursPage() {
    await requireAdminPage();
    const { db } = await import("@/prisma/db");
    const tours = await db.orm.public.Tour.all();

    return (
        <main className="mx-auto max-w-5xl p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Tours</h1>
                    <p className="mt-2 text-gray-600">
                        Manage your tours.
                    </p>
                </div>

                <Link
                    href="/admin/tours/new"
                    className="rounded-md bg-black px-5 py-2 text-white"
                >
                    + Create Tour
                </Link>
            </div>

            <div className="mt-8 space-y-4">
                {tours.length === 0 ? (
                    <p className="rounded-md border p-6 text-gray-500">
                        No tours found.
                    </p>
                ) : (
                    tours.map((tour) => (
                        <div
                            key={tour.id}
                            className="rounded-lg border p-5"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-xl font-semibold">{tour.title}</h2>
                                <Link href={`/admin/tours/${tour.id}`} className="text-sm underline underline-offset-4" aria-label={`Edit tour ${tour.title}`}>Edit tour</Link>
                            </div>

                            <p className="mt-1 text-sm text-gray-500">
                                /{tour.slug} · {tour.isActive ? "Published" : "Archived"}
                            </p>

                            {tour.description && (
                                <p className="mt-3 text-gray-600">
                                    {tour.description}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
