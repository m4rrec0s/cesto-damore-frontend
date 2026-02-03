"use client";

import { useState, useEffect } from "react";
import { PublicFeedBanner } from "@/app/hooks/use-api";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { getInternalImageUrl } from "@/lib/image-helper";

interface FeedBannerCarouselProps {
  banners: PublicFeedBanner[];
}

export default function FeedBannerCarousel({
  banners,
}: FeedBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <section className="relative w-full mb-8 overflow-hidden shadow-lg">
      <div className="w-full overflow-hidden">
        <div className="relative w-full aspect-[1950/512]">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0",
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <Image
                  src={getInternalImageUrl(
                    banner.image_url || "banner-placeholder.png",
                  )}
                  alt={banner.title}
                  fill
                  className="object-cover object-center"
                  style={{ objectPosition: "center center" }}
                  quality={85}
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                />
              </div>

              <div className="relative z-20 h-full flex items-end justify-start px-4">
                <div className="hidden text-left max-w-4xl p-6">
                  <h2
                    className="text-xl md:text-2xl lg:text-3xl font-bold drop-shadow-lg"
                    style={{
                      color: banner.text_color || "white",
                    }}
                  >
                    {banner.title}
                  </h2>

                  {banner.subtitle && (
                    <p
                      className="text-base font-light md:text-lg lg:text-xl mb-6 drop-shadow-md"
                      style={{
                        color: banner.text_color || "white",
                      }}
                    >
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
