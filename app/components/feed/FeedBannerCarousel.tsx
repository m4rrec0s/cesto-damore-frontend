"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
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
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  if (!banners.length) return null;

  return (
    <section className="mx-auto my-5 w-full max-w-[1440px] px-4 sm:my-8 sm:px-6">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.5rem] bg-rose-100 shadow-[0_18px_45px_rgba(99,31,47,0.18)] sm:aspect-[16/7] xl:max-h-[500px]">
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
              <div className="max-w-2xl text-left p-5 sm:p-8">
                <h2
                  className="text-2xl font-bold leading-tight drop-shadow-lg sm:text-3xl lg:text-4xl"
                  style={{
                    color: banner.text_color || "white",
                  }}
                >
                  {banner.title}
                </h2>

                {banner.subtitle && (
                  <p
                    className="mt-2 text-sm font-medium sm:text-lg drop-shadow-md"
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
        {banners.length > 1 && (
          <>
            <div className="absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-between px-3 sm:px-5">
              <button
                type="button"
                onClick={() => setCurrentIndex((currentIndex - 1 + banners.length) % banners.length)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-rose-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((currentIndex + 1) % banners.length)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-rose-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Próximo banner"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-black/25 p-1.5 backdrop-blur-sm">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={cn("h-2 rounded-full transition-all", index === currentIndex ? "w-6 bg-white" : "w-2 bg-white/60")}
                  aria-label={`Exibir banner ${index + 1}`}
                  aria-current={index === currentIndex}
                />
              ))}
              <button
                type="button"
                onClick={() => setIsPaused((paused) => !paused)}
                className="grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/15"
                aria-label={isPaused ? "Retomar rotação automática" : "Pausar rotação automática"}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
