"use client";

import { useState, useEffect } from "react";
import { PublicFeedBanner } from "@/app/hooks/use-api";
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
    <section className="w-full my-8 px-5">
      <div className="relative w-full aspect-video overflow-hidden rounded-xl shadow-lg max-h-[400px] xl:max-h-[500px]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0",
            )}
          >
            <img
              src={
                getInternalImageUrl(banner.image_url) ||
                "banner-placeholder.png"
              }
              alt={banner.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center center" }}
              loading={index === 0 ? "eager" : "lazy"}
            />

            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-start px-4 py-4">
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
    </section>
  );
}
