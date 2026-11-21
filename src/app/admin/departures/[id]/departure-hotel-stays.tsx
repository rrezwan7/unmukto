"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import StayRoomAssignmentPanel from "./stay-room-assignment-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Hotel = {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
};

type Stay = {
  id: number;
  departureId: number;
  hotelId: number;
  destinationId: number | null;
  checkInDate: string;
  checkOutDate: string;
  hotelName: string;
  hotelLocation: string;
  hotelPhone: string | null;
  roomCount: number;
  assignmentCount: number;
};

async function readResponse(response: Response) {
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Request failed.");
  }
  return result;
}

function formatDate(iso: string) {
  try {
    return iso.split("T")[0];
  } catch {
    return iso;
  }
}

export default function DepartureHotelStays({
  departureId,
}: {
  departureId: number;
}) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);

  // New Stay Form State
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [savingStay, setSavingStay] = useState(false);
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

        setHotels(hotelData.hotels.filter((h: Hotel) => h.isActive));
        setStays(stayData.stays);
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

  async function handleAddStay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingStay) return;

    if (!selectedHotelId) {
      setStayError("Select a hotel.");
      return;
    }

    if (!checkInDate || !checkOutDate) {
      setStayError("Provide both check-in and check-out dates.");
      return;
    }

    setSavingStay(true);
    clearStayFeedback();

    try {
      await fetch(`/api/departures/${departureId}/hotel-stays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: Number(selectedHotelId),
          checkInDate,
          checkOutDate,
        }),
      }).then(readResponse);

      setStayMessage("Hotel stay scheduled successfully.");
      setSelectedHotelId("");
      setCheckInDate("");
      setCheckOutDate("");
      setRevision((r) => r + 1);
    } catch (err) {
      setStayError(
        err instanceof Error ? err.message : "Unable to schedule stay."
      );
    } finally {
      setSavingStay(false);
    }
  }

  async function handleDeleteStay(stayId: number) {
    if (!confirm("Are you sure you want to remove this hotel stay?")) return;

    clearStayFeedback();
    try {
      await fetch(`/api/departures/${departureId}/hotel-stays/${stayId}`, {
        method: "DELETE",
      }).then(readResponse);

      setStayMessage("Hotel stay removed.");
      if (expandedStayId === stayId) {
        setExpandedStayId(null);
      }
      setRevision((r) => r + 1);
    } catch (err) {
      setStayError(
        err instanceof Error ? err.message : "Unable to remove stay."
      );
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

  if (loadError) {
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
      {/* 1. Schedule Hotel Stay Form */}
      <Card>
        <CardHeader>
          <CardTitle>Hotels & Accommodations</CardTitle>
          <CardDescription>
            Schedule partner hotel stays for this departure and assign passenger rooms.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleAddStay}
            onChange={clearStayFeedback}
            aria-busy={savingStay}
          >
            <fieldset
              disabled={savingStay}
              className="grid gap-4 sm:grid-cols-4"
            >
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="stay-hotel">Select Partner Hotel</Label>
                {hotels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active hotels found.{" "}
                    <Link
                      href="/admin/hotels"
                      className="text-primary underline"
                    >
                      Register a hotel first
                    </Link>
                    .
                  </p>
                ) : (
                  <NativeSelect
                    id="stay-hotel"
                    value={selectedHotelId}
                    onChange={(e) => setSelectedHotelId(e.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="">
                      Choose a hotel…
                    </NativeSelectOption>
                    {hotels.map((h) => (
                      <NativeSelectOption key={h.id} value={String(h.id)}>
                        {h.name} ({h.location})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stay-checkin">Check-in Date</Label>
                <Input
                  id="stay-checkin"
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stay-checkout">Check-out Date</Label>
                <Input
                  id="stay-checkout"
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>

              <div className="sm:col-span-4">
                <Button
                  type="submit"
                  disabled={savingStay || hotels.length === 0}
                >
                  {savingStay ? "Scheduling…" : "Schedule Hotel Stay"}
                </Button>
              </div>
            </fieldset>

            {stayMessage && (
              <p
                role="status"
                className="mt-3 text-sm font-medium text-green-700"
              >
                {stayMessage}
              </p>
            )}
            {stayError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {stayError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 2. Scheduled Stays List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Stays ({stays.length})</CardTitle>
          <CardDescription>
            Stays scheduled for this departure. Manage passenger room assignments for each stay below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {stays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hotel stays scheduled for this departure yet. Add a hotel stay above.
            </p>
          ) : (
            <div className="space-y-4">
              {stays.map((stay) => {
                const isExpanded = expandedStayId === stay.id;

                return (
                  <div
                    key={stay.id}
                    className="rounded-lg border p-4 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{stay.hotelName}</h3>
                          <span className="text-xs text-muted-foreground">
                            ({stay.hotelLocation})
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          <span>
                            <strong>Check-in:</strong>{" "}
                            {formatDate(stay.checkInDate)} ·{" "}
                            <strong>Check-out:</strong>{" "}
                            {formatDate(stay.checkOutDate)}
                          </span>
                          <span className="ml-3 font-medium text-foreground">
                            {stay.assignmentCount} assigned · {stay.roomCount} physical rooms
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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
                          onClick={() => handleDeleteStay(stay.id)}
                        >
                          Remove Stay
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <StayRoomAssignmentPanel
                        departureId={departureId}
                        stayId={stay.id}
                        hotelId={stay.hotelId}
                        onAssignmentChange={() => setRevision((r) => r + 1)}
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
