"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tour = {
    id: number;
    title: string;
};

export default function NewDeparturePage() {
    const router = useRouter();

    const [tours, setTours] = useState<Tour[]>([]);
    const [tourId, setTourId] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [departureTime, setDepartureTime] = useState("");
    const [returnTime, setReturnTime] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadTours() {
            const response = await fetch("/api/tours");
            const data = await response.json();

            if (response.ok) {
                setTours(data.tours);
            }
        }

        loadTours();
    }, []);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSaving(true);
        setError("");

        try {
            const response = await fetch("/api/departures", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tourId,
                    departureDate,
                    returnDate,
                    departureTime,
                    returnTime,
                }),
            });

            const text = await response.text();

            if (!response.ok) {
                throw new Error(
                    `Server returned ${response.status}: ${text || "(empty response)"}`
                );
            }

            let data;

            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(
                    `Server returned invalid JSON: ${text || "(empty response)"}`
                );
            }

            console.log("Created departure:", data);

            router.push("/admin/departures");
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Something went wrong"
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="mx-auto max-w-2xl p-8">
            <h1 className="text-3xl font-bold">Create Departure</h1>

            <p className="mt-2 text-gray-600">
                Schedule a departure for an existing tour.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                    <label className="mb-2 block font-medium">Tour</label>

                    <select
                        value={tourId}
                        onChange={(event) => setTourId(event.target.value)}
                        required
                        className="w-full rounded-md border px-3 py-2"
                    >
                        <option value="">Select a tour</option>

                        {tours.map((tour) => (
                            <option key={tour.id} value={tour.id}>
                                {tour.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block font-medium">
                        Departure date
                    </label>

                    <input
                        type="date"
                        value={departureDate}
                        onChange={(event) => setDepartureDate(event.target.value)}
                        required
                        className="w-full rounded-md border px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">
                        Return date
                    </label>

                    <input
                        type="date"
                        value={returnDate}
                        onChange={(event) => setReturnDate(event.target.value)}
                        className="w-full rounded-md border px-3 py-2"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block font-medium">
                            Departure time
                        </label>

                        <input
                            type="time"
                            value={departureTime}
                            onChange={(event) => setDepartureTime(event.target.value)}
                            className="w-full rounded-md border px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block font-medium">
                            Return time
                        </label>

                        <input
                            type="time"
                            value={returnTime}
                            onChange={(event) => setReturnTime(event.target.value)}
                            className="w-full rounded-md border px-3 py-2"
                        />
                    </div>
                </div>

                {error && (
                    <p className="rounded-md bg-red-50 p-3 text-red-600">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-black px-5 py-2 text-white disabled:opacity-50"
                >
                    {saving ? "Creating..." : "Create Departure"}
                </button>
            </form>
        </main>
    );
}