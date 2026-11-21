import Image from "next/image";
import { tourCoverSource } from "@/lib/tour-cover";

export function TourCoverImage({ cover, sizes }: { cover: string | null; sizes: string }) {
  const src = tourCoverSource(cover);
  if (!src) return null;
  return (
    <>
      <Image src={src} alt="" fill unoptimized sizes={sizes} className="object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-[#0c261ef0]/75" />
    </>
  );
}
