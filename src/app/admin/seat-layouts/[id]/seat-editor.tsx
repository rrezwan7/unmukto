"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import SeatForm, { type EditableSeat } from "./seat-form";

export default function SeatEditor({
  layoutId, seats, vehicleCount,
}: { layoutId: number; seats: EditableSeat[]; vehicleCount: number }) {
  const [selected, setSelected] = useState("");
  const seat = seats.find((seat) => String(seat.id) === selected);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="seat-to-edit">Choose a seat to edit</Label>
        <NativeSelect id="seat-to-edit" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <NativeSelectOption value="">Select a seat</NativeSelectOption>
          {seats.map((seat) => (
            <NativeSelectOption key={seat.id} value={seat.id}>
              {seat.seatNumber}{seat.isAvailable ? "" : " (disabled)"}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {seat && <SeatForm key={seat.id} layoutId={layoutId} seat={seat} vehicleCount={vehicleCount} />}
    </section>
  );
}
