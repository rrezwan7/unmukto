import Link from "next/link";
import { Compass, ArrowUpRight } from "lucide-react";

export function PublicHeader({ activePath }: { activePath?: string }) {
  return (
    <header className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-6 px-6 py-6 md:px-12 md:py-7">
      <Link
        href="/"
        className="flex items-center gap-3 text-inherit transition-opacity hover:opacity-90"
        aria-label="উন্মুক্ত হোম"
      >
        <span className="grid size-11 place-items-center rounded-full border border-[#193d32] text-[#193d32]">
          <Compass size={24} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span>
          <strong className="block text-xl tracking-tight text-[#193d32] font-sans md:text-2xl">
            UNMUKTO<span className="text-[#b27433]">.</span>
          </strong>
          <small className="block text-[10px] tracking-wider text-[#61746a]">
            খোলা পথে, নতুন গল্পে
          </small>
        </span>
      </Link>

      <nav
        aria-label="প্রধান নেভিগেশন"
        className="flex items-center gap-5 text-sm font-medium text-[#193d32] md:gap-7"
      >
        <Link
          href="/"
          className={`transition-colors hover:text-[#a66521] ${
            activePath === "/" ? "font-semibold text-[#a66521]" : ""
          }`}
        >
          হোম
        </Link>
        <Link
          href="/#journeys"
          className="transition-colors hover:text-[#a66521]"
        >
          ভ্রমণের ভাবনা
        </Link>
        <Link
          href="/#about"
          className="transition-colors hover:text-[#a66521]"
        >
          আমাদের কথা
        </Link>
        <Link
          href="/account/bookings"
          aria-current={activePath === "/account/bookings" ? "page" : undefined}
          className="transition-colors hover:text-[#a66521]"
        >
          আমার বুকিং
        </Link>
        <Link
          href="/tours"
          className={`flex items-center gap-2 rounded-full border border-[#cad2c4] px-4 py-2 transition-all hover:border-[#193d32] hover:bg-[#193d32] hover:text-white ${
            activePath === "/tours"
              ? "bg-[#193d32] text-white"
              : "bg-transparent text-[#193d32]"
          }`}
        >
          <span>ট্যুর সমূহ</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
