import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SeatLayoutPage({ params }: Props) {
  await requireAdminPage();

  const { id } = await params;
  const layoutId = Number(id);

  if (!Number.isSafeInteger(layoutId) || layoutId <= 0) {
    return <main className="p-6">Invalid layout ID.</main>;
  }

  const { db } = await import("@/prisma/db");

  const layout = await db.orm.public.SeatLayout
    .where({ id: layoutId })
    .first();

  if (!layout) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Seat layout not found</h1>
        <Link href="/admin/vehicles" className="mt-4 inline-block underline">
          ← Back to Vehicles
        </Link>
      </main>
    );
  }

  const seats = await db.orm.public.Seat
    .where({ seatLayoutId: layoutId })
    .all();

  seats.sort(
    (a, b) =>
      (a.rowNumber ?? 0) - (b.rowNumber ?? 0) ||
      (a.columnNumber ?? 0) - (b.columnNumber ?? 0) ||
      a.id - b.id
  );

  const positioned = seats.filter(
    (seat) =>
      seat.rowNumber !== null &&
      seat.columnNumber !== null &&
      seat.rowNumber >= 1 &&
      seat.columnNumber >= 1
  );

  const unpositioned = seats.filter(
    (seat) => !positioned.some((item) => item.id === seat.id)
  );

  const columns = Math.max(
    1,
    ...positioned.map((seat) => seat.columnNumber!)
  );

  const rows = Math.max(
    1,
    ...positioned.map((seat) => seat.rowNumber!)
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <Link
          href="/admin/vehicles"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Vehicles
        </Link>

        <h1 className="mt-3 text-2xl font-bold">{layout.name}</h1>

        {layout.description && (
          <p className="mt-1 text-muted-foreground">
            {layout.description}
          </p>
        )}

        <p className="mt-2 text-sm">
          {seats.length} seats ·{" "}
          {seats.filter((seat) => seat.isAvailable).length} enabled
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Seat Layout</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Empty spaces represent gaps in the layout. This shows seat
          configuration, not departure booking availability.
        </p>

        {seats.length === 0 ? (
          <p className="mt-5">This layout has no seats yet.</p>
        ) : (
          <>
            <div className="mt-5 overflow-auto rounded-lg border bg-muted/20 p-5">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 64px)`,
                  gridTemplateRows: `repeat(${rows}, 56px)`,
                  width: "max-content",
                  marginInline: "auto",
                }}
              >
                {positioned.map((seat) => (
                  <div
                    key={seat.id}
                    title={`Row ${seat.rowNumber}, column ${seat.columnNumber}`}
                    className={`flex flex-col items-center justify-center rounded-lg border text-sm ${
                      seat.isAvailable
                        ? "border-green-600 bg-green-50 text-green-900"
                        : "border-gray-400 bg-gray-100 text-gray-600"
                    }`}
                    style={{
                      gridRowStart: seat.rowNumber!,
                      gridColumnStart: seat.columnNumber!,
                    }}
                  >
                    <span className="font-semibold">{seat.seatNumber}</span>
                    <span className="text-xs">
                      {seat.isAvailable ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {unpositioned.length > 0 && (
              <div className="mt-5">
                <h3 className="font-medium">Seats without positions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {unpositioned.map((seat) => seat.seatNumber).join(", ")}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}