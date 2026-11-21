"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Room = {
  id: number;
  roomNumber: string;
  roomType: string;
  capacity: number;
  occupied: number;
  isFull: boolean;
  availableSlots: number;
};

type Passenger = {
  id: number;
  name: string;
  passengerType: string;
  bookingId: number;
  bookingNumber: string;
  bookingStatus: string;
  canAssign: boolean;
  assignment: {
    id: number;
    roomId: number;
    roomNumber: string;
    roomType: string;
  } | null;
};

async function readResponse(response: Response) {
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Request failed.");
  }
  return result;
}

export default function StayRoomAssignmentPanel({
  departureId,
  stayId,
  hotelId,
  bookingId,
  onAssignmentChange,
}: {
  departureId: number;
  stayId: number;
  hotelId: number;
  bookingId?: number;
  onAssignmentChange?: () => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingPassengerId, setPendingPassengerId] = useState<number | null>(null);
  const [selectedRoomByPassenger, setSelectedRoomByPassenger] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const data = await fetch(
          `/api/departures/${departureId}/hotel-stays/${stayId}/room-assignments`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        ).then(readResponse);

        setRooms(data.rooms);
        setPassengers(data.passengers);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "Unable to load room assignments."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [departureId, stayId, revision]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function handleAssign(passengerId: number) {
    const roomId = selectedRoomByPassenger[passengerId];
    if (!roomId) {
      setError("Select a room to assign.");
      return;
    }

    setPendingPassengerId(passengerId);
    clearFeedback();

    try {
      await fetch(
        `/api/departures/${departureId}/hotel-stays/${stayId}/room-assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passengerId,
            roomId: Number(roomId),
          }),
        }
      ).then(readResponse);

      setMessage("Room assigned successfully.");
      setRevision((r) => r + 1);
      onAssignmentChange?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to assign room."
      );
    } finally {
      setPendingPassengerId(null);
    }
  }

  async function handleUnassign(passengerId: number) {
    setPendingPassengerId(passengerId);
    clearFeedback();

    try {
      await fetch(
        `/api/departures/${departureId}/hotel-stays/${stayId}/room-assignments`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passengerId }),
        }
      ).then(readResponse);

      setMessage("Passenger unassigned from room.");
      setRevision((r) => r + 1);
      onAssignmentChange?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to unassign passenger."
      );
    } finally {
      setPendingPassengerId(null);
    }
  }

  if (loading) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading room assignment details…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-4 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  const visiblePassengers = bookingId === undefined ? passengers : passengers.filter((passenger) => passenger.bookingId === bookingId);

  return (
    <div className="mt-4 space-y-4 rounded-md border p-4">
      {/* Rooms occupancy snapshot */}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Rooms Status in Hotel</h4>
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rooms configured for this hotel.{" "}
            <Link
              href={`/admin/hotels/${hotelId}`}
              className="text-primary underline"
            >
              Configure rooms in Hotel Management
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {rooms.map((r) => (
              <div
                key={r.id}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  r.isFull
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : r.occupied > 0
                    ? "border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                <span>Room {r.roomNumber} ({r.roomType}): </span>
                <strong>{r.occupied}/{r.capacity}</strong>
                {r.isFull ? " (Full)" : ` (${r.availableSlots} left)`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Passenger Assignment Table */}
      <div>
        <h4 className="mb-2 text-sm font-semibold">
          Passengers ({visiblePassengers.length})
        </h4>

        {visiblePassengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No passengers to show for this selection.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Passenger</TableHead>
                <TableHead scope="col">Type</TableHead>
                <TableHead scope="col">Booking</TableHead>
                <TableHead scope="col">Assigned Room</TableHead>
                <TableHead scope="col">Assign / Change</TableHead>
                <TableHead scope="col" className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visiblePassengers.map((passenger) => {
                const isPending = pendingPassengerId === passenger.id;
                const hasAssignment = Boolean(passenger.assignment);

                return (
                  <TableRow key={passenger.id}>
                    <TableCell className="font-medium">
                      {passenger.name}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {passenger.passengerType}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {passenger.bookingNumber} ({passenger.bookingStatus})
                    </TableCell>

                    <TableCell>
                      {passenger.assignment ? (
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Room {passenger.assignment.roomNumber} ({passenger.assignment.roomType})
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {passenger.canAssign ? "Unassigned" : "Awaiting confirmation"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <NativeSelect
                        value={
                          selectedRoomByPassenger[passenger.id] ??
                          (passenger.assignment?.roomId ? String(passenger.assignment.roomId) : "")
                        }
                        onChange={(e) =>
                          setSelectedRoomByPassenger((prev) => ({
                            ...prev,
                            [passenger.id]: e.target.value,
                          }))
                        }
                        disabled={!passenger.canAssign || isPending || rooms.length === 0}
                        className="w-44 text-xs"
                      >
                        <NativeSelectOption value="">
                          Select room…
                        </NativeSelectOption>
                        {rooms.map((room) => {
                          const isCurrent = passenger.assignment?.roomId === room.id;
                          const disabled = !isCurrent && room.isFull;

                          return (
                            <NativeSelectOption
                              key={room.id}
                              value={String(room.id)}
                              disabled={disabled}
                            >
                              Room {room.roomNumber} ({room.roomType}) [{room.occupied}/{room.capacity}]
                              {disabled ? " - FULL" : ""}
                            </NativeSelectOption>
                          );
                        })}
                      </NativeSelect>
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(passenger.id)}
                        disabled={
                          !passenger.canAssign || isPending ||
                          !selectedRoomByPassenger[passenger.id] ||
                          selectedRoomByPassenger[passenger.id] === String(passenger.assignment?.roomId)
                        }
                      >
                        {isPending ? "Saving…" : hasAssignment ? "Change" : "Assign"}
                      </Button>

                      {hasAssignment && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleUnassign(passenger.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {message && (
        <p role="status" className="text-sm font-medium text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
