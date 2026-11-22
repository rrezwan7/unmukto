import { isRecord } from "@/lib/tour-editor";

export function parseVehicle(input: unknown) {
  if (!isRecord(input)) return { error: "Vehicle information is required." };
  const { name, type, registrationNumber, description, isActive } = input;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    return { error: "Provide a vehicle name of 1–120 characters." };
  }
  if (type !== "BUS" && type !== "COACH" && type !== "MICROBUS" &&
      type !== "MINIBUS" && type !== "OTHER") {
    return { error: "Choose a valid vehicle type." };
  }
  if (registrationNumber != null &&
      (typeof registrationNumber !== "string" || registrationNumber.trim().toUpperCase().length > 100)) {
    return { error: "Registration number must contain at most 100 characters." };
  }
  if (description != null && (typeof description !== "string" || description.length > 2000)) {
    return { error: "Description must contain at most 2,000 characters." };
  }
  if (typeof isActive !== "boolean") return { error: "Specify whether the vehicle is active." };

  return {
    vehicle: {
      name: name.trim(),
      type,
      registrationNumber: registrationNumber?.trim().toUpperCase() || null,
      description: description?.trim() || null,
      isActive,
    },
  } as const;
}

export const duplicateRegistration = "A vehicle with this registration number already exists.";
