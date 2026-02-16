"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface MockupGalleryProps {
  designUrl: string;
  itemType?: string;
  className?: string;
}

const FRAME_MOCKUPS = [
  {
    id: 1,
    src: "/mockups/frame/mockup1.jpg",
    name: "Ambiente 1",
    artPos: {
      top: "50%",
      left: "50%",
      width: "100%",
      height: "79%",
      rotate: "0deg",
    },
  },
  {
    id: 2,
    src: "/mockups/frame/mockup2.jpg",
    name: "Ambiente 2",
    artPos: {
      top: "48%",
      left: "49.5%",
      width: "31%",
      height: "80%",
      rotate: "0deg",
    },
  },
  {
    id: 3,
    src: "/mockups/frame/mockup3.jpg",
    name: "Ambiente 3",
    artPos: {
      top: "50%",
      left: "53%",
      width: "44%",
      height: "100%",
      rotate: "0deg",
    },
  },
  {
    id: 4,
    src: "/mockups/frame/mockup4.jpg",
    name: "Ambiente 4",
    artPos: {
      top: "45%",
      left: "52%",
      width: "38%",
      height: "52%",
      rotate: "3deg",
    },
  },
  {
    id: 5,
    src: "/mockups/frame/mockup5.jpg",
    name: "Ambiente 5",
    artPos: {
      top: "47.5%",
      left: "51%",
      width: "60%",
      height: "72%",
      rotate: "-0.5deg",
    },
  },
];

export function MockupGallery({
  designUrl,
  itemType,
  className,
}: MockupGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const normalizedType = itemType?.toLowerCase();

  if (normalizedType !== "frame" && normalizedType !== "quadro") {
    return null;
  }

  const mockups = FRAME_MOCKUPS;
  const currentMockup = mockups[currentIndex];

  const next = () => setCurrentIndex((prev) => (prev + 1) % mockups.length);
  const prev = () =>
    setCurrentIndex((prev) => (prev - 1 + mockups.length) % mockups.length);

  if (imageError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-gray-100",
          className,
        )}
      >
        <div className="relative aspect-square w-full flex items-center justify-center p-8">
          <div className="relative w-full h-full">
            <Image
              src={designUrl}
              alt="Seu Design"
              fill
              className="object-contain"
            />
          </div>
        </div>
        <div className="p-3 bg-white border-t text-center">
          <span className="text-sm font-medium text-gray-700">Seu Design</span>
          <p className="text-xs text-gray-500 mt-1">
            Configure mockups em /public/mockups/frame/
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative group overflow-hidden rounded-xl bg-white",
        className,
      )}
    >
      <div className="relative aspect-square w-full">
        
        <Image
          src={currentMockup.src}
          alt={currentMockup.name}
          fill
          className="object-cover"
          priority
          onError={() => {
            console.error(
              "❌ [MockupGallery] Erro ao carregar mockup:",
              currentMockup.src,
            );
            setImageError(true);
          }}
        />

        
        <div
          className="absolute overflow-hidden flex items-center justify-center"
          style={{
            top: currentMockup.artPos.top,
            left: currentMockup.artPos.left,
            width: currentMockup.artPos.width,
            height: currentMockup.artPos.height,
            transform: `translate(-50%, -50%) rotate(${currentMockup.artPos.rotate})`,
          }}
        >
          <Image
            src={designUrl}
            alt="Seu Design"
            fill
            className="object-contain"
          />
        </div>

        
        <div className="absolute inset-0 flex items-center justify-between p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            onClick={prev}
            className="rounded-full bg-white/90 hover:bg-white shadow-md h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={next}
            className="rounded-full bg-white/90 hover:bg-white shadow-md h-9 w-9"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {mockups.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentIndex ? "bg-white w-6" : "bg-white/50 w-1.5",
              )}
            />
          ))}
        </div>
      </div>

      
      <div className="p-3 bg-white border-t text-center">
        <span className="text-sm font-medium text-gray-700">
          {currentMockup.name}
        </span>
      </div>
    </div>
  );
}
