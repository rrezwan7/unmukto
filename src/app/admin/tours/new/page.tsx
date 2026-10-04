"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTourPage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSaving(true);
        setError("");

        try {
            const response = await fetch("/api/tours", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    slug,
                    description,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create tour");
            }

            router.push("/admin/tours");
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
            <h1 className="text-3xl font-bold">Create Tour</h1>

            <p className="mt-2 text-gray-600">
                Add a new tour to your website.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                    <label className="mb-2 block font-medium">Tour title</label>

                    <input
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Sajek Valley Tour"
                        required
                        className="w-full rounded-md border px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Slug</label>

                    <input
                        type="text"
                        value={slug}
                        onChange={(event) => setSlug(event.target.value)}
                        placeholder="sajek-valley-tour"
                        required
                        className="w-full rounded-md border px-3 py-2"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Description</label>

                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Describe this tour..."
                        rows={5}
                        className="w-full rounded-md border px-3 py-2"
                    />
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
                    {saving ? "Creating..." : "Create Tour"}
                </button>
            </form>
        </main>
    );
}