"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { StoreBannerPublic } from "@/lib/types";

export function BannerSlideshow({
  banners,
  subtitleFontFamily,
}: {
  banners: StoreBannerPublic[];
  subtitleFontFamily: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const active = banners[index];
  const content = (
    <div className="relative aspect-[1600/500] w-full overflow-hidden rounded-2xl bg-white/5">
      <Image
        src={active.image_url}
        alt={active.title ?? ""}
        fill
        priority
        className="h-full w-full object-cover"
        sizes="100vw"
      />
      {(active.title || active.subtitle) && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-5 sm:p-8">
          {active.title && <p className="text-xl font-semibold text-white sm:text-2xl">{active.title}</p>}
          {active.subtitle && (
            <p style={{ fontFamily: subtitleFontFamily }} className="mt-1 text-sm text-white/85">
              {active.subtitle}
            </p>
          )}
        </div>
      )}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`Ver banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return active.target_link ? (
    <a href={active.target_link} className="block">
      {content}
    </a>
  ) : (
    content
  );
}
