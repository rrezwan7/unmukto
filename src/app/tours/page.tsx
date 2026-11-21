import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_Bengali } from "next/font/google";
import { ArrowUpRight, Calendar, Compass, MapPin, Users } from "lucide-react";
import { getPublicTours } from "@/lib/catalog";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { TourCoverImage } from "@/components/tour-cover-image";

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ট্যুর সমূহ | Unmukto",
  description: "উন্মুক্তর সাথে বাংলাদেশের পথে নতুন গল্প। আমাদের আসন্ন ট্যুর আয়োজন, যাত্রার তারিখ ও আসন বিস্তারিত জানুন।",
  openGraph: {
    title: "ট্যুর সমূহ — Unmukto",
    description: "খোলা পথে, নতুন গল্পে। আসন্ন ভ্রমণ আয়োজন দেখুন।",
    locale: "bn_BD",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function ToursCatalogPage() {
  const tours = await getPublicTours();

  return (
    <div
      lang="bn"
      className={`min-h-screen flex flex-col bg-[#f7f7ee] text-[#193d32] ${bengali.className}`}
    >
      <PublicHeader activePath="/tours" />

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-[1300px] px-6 pt-10 pb-12 md:px-12 md:pt-14 md:pb-16">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-[#b27433]">
              <span className="size-2 rounded-full bg-[#b27433]" />
              আসন্ন ভ্রমণ আয়োজন
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[#193d32] sm:text-4xl md:text-5xl">
              আমাদের ট্যুর সমূহ
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#61746a] md:text-lg">
              প্রকৃতির কাছে ফিরে যাওয়ার জন্য আমাদের নির্ধারিত ট্যুরগুলো দেখুন। বিস্তারিত যাত্রাপথ, থাকার ব্যবস্থা ও খরচ জেনে পছন্দের তারিখে অংশ নিন।
            </p>
          </div>
        </section>

        {/* Tours Grid */}
        <section className="mx-auto max-w-[1300px] px-6 pb-24 md:px-12">
          {tours.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cad2c4] bg-[#edf0e4]/50 p-12 text-center md:p-16">
              <span className="grid size-16 place-items-center rounded-full bg-[#e4e9d9] text-[#193d32]">
                <Compass size={32} strokeWidth={1.5} />
              </span>
              <h2 className="mt-4 text-xl font-bold text-[#193d32]">
                নতুন ট্যুরের প্রস্তুতি চলছে
              </h2>
              <p className="mt-2 max-w-md text-sm text-[#61746a]">
                আমাদের আগামী ভ্রমণ আয়োজনের তারিখ ও বিস্তারিত খুব শীঘ্রই এখানে প্রকাশ করা হবে। সঙ্গেই থাকুন!
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#193d32] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#325b47]"
              >
                ← হোমপেজে ফিরে যান
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <article
                  key={tour.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#cad2c4] bg-white shadow-sm transition-all hover:shadow-md hover:border-[#193d32]/40"
                >
                  {/* Card Header Banner */}
                  <div className="relative flex h-48 flex-col justify-between bg-gradient-to-br from-[#254f3e] to-[#193d32] p-6 text-white">
                    <TourCoverImage cover={tour.coverImage} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                        {tour.durationLabel}
                      </span>

                      {tour.hasOpenBooking && tour.totalAvailableSeats > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-[#b27433] px-2.5 py-0.5 text-xs font-semibold text-white">
                          বুকিং চলছে
                        </span>
                      ) : tour.hasOpenBooking && tour.totalAvailableSeats === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-800/80 px-2.5 py-0.5 text-xs font-semibold text-white">
                          আসন পূর্ণ
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                          তারিখ আসছে
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <h2 className="text-xl font-bold tracking-tight text-white line-clamp-1">
                        {tour.title}
                      </h2>
                      {tour.startingFare && (
                        <p className="mt-1 text-sm font-medium text-[#f4f1d9]">
                          ৳{Number(tour.startingFare).toLocaleString("en-IN")} থেকে শুরু
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <p className="text-sm leading-relaxed text-[#61746a] line-clamp-3">
                      {tour.description || "এই ট্যুরের বিস্তারিত তথ্যের জন্য ক্লিক করুন।"}
                    </p>

                    <div className="mt-6 space-y-3 border-t border-[#edf0e4] pt-4 text-xs text-[#526558]">
                      {tour.nextDepartureDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-[#b27433]" />
                          <span>
                            পরবর্তী যাত্রা: <strong>{tour.nextDepartureDate}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#61746a]">
                          <Calendar size={15} />
                          <span>যাত্রার নতুন তারিখ শীঘ্রই ঘোষিত হবে</span>
                        </div>
                      )}

                      {tour.upcomingDeparturesCount > 0 && (
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-[#b27433]" />
                          <span>
                            নির্ধারিত যাত্রা: <strong>{tour.upcomingDeparturesCount}টি</strong>
                          </span>
                        </div>
                      )}

                      {tour.hasOpenBooking && tour.totalAvailableSeats > 0 && (
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-[#b27433]" />
                          <span>
                            উপলব্ধ আসন: <strong>{tour.totalAvailableSeats}টি</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-2">
                      <Link
                        href={`/tours/${tour.slug}`}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#193d32] py-3 text-sm font-medium text-white transition-colors hover:bg-[#325b47]"
                      >
                        <span>বিস্তারিত ও বুকিং</span>
                        <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
