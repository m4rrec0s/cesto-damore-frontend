"use client";

import { useState, useEffect } from "react";
import { PublicFeedBanner } from "@/app/hooks/use-api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { Button } from "../ui/button";

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
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (!banners.length) return null;

  return (
    <section className="relative w-full mb-8 overflow-hidden shadow-lg">
      {/* <div className="absolute w-full inset-0 h-[10%] bg-gradient-to-b from-rose-400 to-transparent z-50" /> */}

      <div className="w-full overflow-hidden">
        <div className="relative w-full h-[270px] sm:h-[320px] md:h-[350px] lg:h-[400px]">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
            >
              {banner.image_url ? (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <Image
                    src={banner.image_url}
                    alt={banner.title}
                    fill
                    className="object-cover object-center"
                    style={{ objectPosition: "center center" }}
                    quality={100}
                    priority={index === 0}
                    unoptimized
                    sizes="100vw"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200" />
              )}

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

      {banners.length > 1 && (
        <>
          <Button
            onClick={goToPrev}
            aria-label="Banner anterior"
            className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1.5 sm:p-2 rounded-full hover:bg-opacity-70 transition-all z-20"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <Button
            onClick={goToNext}
            aria-label="Próximo banner"
            className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1.5 sm:p-2 rounded-full hover:bg-opacity-70 transition-all z-20"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {banners.map((_, index) => (
            <Button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Ir para banner ${index + 1}`}
              className={cn(
                "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white scale-110"
                  : "bg-white bg-opacity-50 hover:bg-opacity-70"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
