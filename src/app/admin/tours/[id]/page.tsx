import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-auth";
import { getTourItinerary, isDatabaseId } from "@/lib/tour-editor";
import { db } from "@/prisma/db";
import ItineraryEditor from "./itinerary-editor";
import TourDetailsForm from "./tour-details-form";

export default async function EditTourPage({ params }: PageProps<"/admin/tours/[id]">) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!isDatabaseId(id)) notFound();

  const tour = await db.orm.public.Tour.where({ id }).first();
  if (!tour) notFound();
  const itinerary = await getTourItinerary(tour.id);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href="/admin/tours" className="text-sm text-muted-foreground hover:underline">← Back to Tours</Link>
        <h1 className="mt-3 text-2xl font-semibold">Edit Tour</h1>
      </div>
      <TourDetailsForm initialTour={tour} />
      <ItineraryEditor tourId={tour.id} initialItinerary={itinerary} />
    </main>
  );
}
