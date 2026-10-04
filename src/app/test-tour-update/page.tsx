"use client";

import { useState } from "react";

export default function TestTourUpdatePage() {
    const [message, setMessage] = useState("");

    async function updateTour() {
        const response = await fetch("/api/tours/2", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: "Cox's Bazar Beach Tour",
                slug: "coxs-bazar-beach-tour",
                description: "Enjoy a beautiful beach tour to Cox's Bazar.",
            }),
        });

        const text = await response.text();

        setMessage(
            `Status: ${response.status}\n\n${text || "(empty response)"}`
        );
    }

    return (
        <main className="p-8">
            <h1 className="text-2xl font-bold">Test Tour Update</h1>

            <button
                onClick={updateTour}
                className="mt-4 rounded-md bg-black px-4 py-2 text-white"
            >
                Update Tour
            </button>

            {message && (
                <pre className="mt-6 rounded-md bg-gray-100 p-4">
                    {message}
                </pre>
            )}
        </main>
    );
}