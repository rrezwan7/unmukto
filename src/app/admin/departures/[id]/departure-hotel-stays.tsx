"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StayRoomAssignmentPanel from "./stay-room-assignment-panel";
import { Button } from "@/components/ui/button";
import HotelStayForm, { type EditableStay, type StayHotel, type StayStop } from "./hotel-stay-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Stay = EditableStay & {
  hotelName: string;
  hotelLocation: string;
  roomCount: number;
};

async function readResponse(response: Response) {
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Request failed.");
  }
  return result;
}

export default function DepartureHotelStays({
  departureId,
  bookingId,
}: {
  departureId: number;
  bookingId?: number;
}) {
  const router = useRouter();
  const [hotels, setHotels] = useState<StayHotel[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [stops, setStops] = useState<StayStop[]>([]);
  const [editingStayId, setEditingStayId] = useState<number | null>(null);
  const [removingStayId, setRemovingStayId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);

  const [stayError, setStayError] = useState("");
  const [stayMessage, setStayMessage] = useState("");

  // Expanded stay for room assignments
  const [expandedStayId, setExpandedStayId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [hotelData, stayData] = await Promise.all([
          fetch("/api/hotels", {
            signal: controller.signal,
            cache: "no-store",
          }).then(readResponse),
          fetch(`/api/departures/${departureId}/hotel-stays`, {
            signal: controller.signal,
            cache: "no-store",
          }).then(readResponse),
        ]);

        if (controller.signal.aborted) return;
        setHotels(hotelData.hotels);
        setStays(stayData.stays);
        setStops(stayData.stops);
        setLoadError("");
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load stays."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [departureId, revision]);

  function clearStayFeedback() {
    setStayError("");
    setStayMessage("");
  }

  function refreshStays() {
    setRevision((revision) => revision + 1);
    router.refresh();
  }

  function staySaved(message: string) {
    setStayError("");
    setStayMessage(message);
    refreshStays();
  }

  async function handleDeleteStay(stayId: number) {
    if (removingStayId !== null || !confirm("Remove this hotel stay?")) return;

    clearStayFeedback();
    setRemovingStayId(stayId);
    try {
      await fetch(`/api/departures/${departureId}/hotel-stays/${stayId}`, {
        method: "DELETE",
      }).then(readResponse);

      if (expandedStayId === stayId) setExpandedStayId(null);
      staySaved("Hotel stay removed.");
    } catch (err) {
      setStayError(
        err instanceof Error ? err.message : "Unable to remove stay."
      );
    } finally {
      setRemovingStayId(null);
    }
  }

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading accommodation details…
        </CardContent>
      </Card>
    );
  }

  if (loadError && revision === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 text-sm text-destructive">
          {loadError}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {loadError && <p role="alert" className="text-sm text-destructive">{loadError} Reload to refresh the stay list.</p>}
      <Card>
        <CardHeader>
          <CardTitle>Hotels & Accommodations</CardTitle>
          <CardDescription>
            Schedule partner hotel stays for this departure and assign passenger rooms.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <HotelStayForm departureId={departureId} hotels={hotels} stops={stops}
            onSaved={() => staySaved("Hotel stay scheduled.")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Stays ({stays.length})</CardTitle>
          <CardDescription>
            Stays scheduled for this departure. Manage passenger room assignments for each stay below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {stayMessage && <p role="status" className="mb-4 text-sm font-medium text-green-700">{stayMessage}</p>}
          {stayError && <p role="alert" className="mb-4 text-sm text-destructive">{stayError}</p>}
          {stays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hotel stays scheduled for this departure yet. Add a hotel stay above.
            </p>
          ) : (
            <div className="space-y-4">
              {stays.map((stay) => {
                const isExpanded = expandedStayId === stay.id;
                const isEditing = editingStayId === stay.id;
                const stop = stops.find((stop) => stop.id === stay.destinationId);

                return (
                  <div
                    key={stay.id}
                    className="rounded-lg border p-4 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            <Link href={`/admin/hotels/${stay.hotelId}`} className="hover:underline">{stay.hotelName}</Link>
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            ({stay.hotelLocation})
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          <span>
                            <strong>Check-in:</strong>{" "}
                            {stay.checkInDay} ·{" "}
                            <strong>Check-out:</strong>{" "}
                            {stay.checkOutDay}
                          </span>
                          {stop && <span className="block">Day {stop.dayNumber} · {stop.name}</span>}
                          <span className="block font-medium text-foreground">
                            {stay.assignmentCount} assigned · {stay.allotmentCount} allotted · {stay.roomCount} physical rooms
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" disabled={editingStayId !== null || removingStayId !== null}
                          onClick={() => {
                            clearStayFeedback();
                            setEditingStayId(stay.id);
                          }}>
                          Edit Stay
                        </Button>
                        <Button
                          variant={isExpanded ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setExpandedStayId(isExpanded ? null : stay.id)
                          }
                        >
                          {isExpanded
                            ? "Close Room Assignment"
                            : "Manage Room Assignment"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={isEditing || removingStayId !== null}
                          onClick={() => void handleDeleteStay(stay.id)}
                        >
                          Remove Stay
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 border-t pt-4">
                        <HotelStayForm key={stay.id} departureId={departureId} hotels={hotels} stops={stops} stay={stay}
                          onSaved={() => {
                            setEditingStayId(null);
                            staySaved("Hotel stay saved.");
                          }}
                          onCancel={() => setEditingStayId(null)} />
                      </div>
                    )}

                    {isExpanded && (
                      <StayRoomAssignmentPanel key={stay.hotelId}
                        departureId={departureId}
                        stayId={stay.id}
                        hotelId={stay.hotelId}
                        bookingId={bookingId}
                        onAssignmentChange={refreshStays}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
