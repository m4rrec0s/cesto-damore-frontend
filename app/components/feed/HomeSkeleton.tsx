"use client";

import { Card } from "../ui/card";

export default function HomeSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col space-y-8 pb-12">
            {/* Banner Skeleton */}
            <div className="w-full h-[270px] sm:h-[320px] md:h-[350px] lg:h-[400px] bg-gray-200 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-[shimmer_2s_infinite]" />
            </div>

            {/* Sections Skeleton */}
            {[1, 2].map((section) => (
                <section key={section} className="w-full">
                    <div className="mx-auto max-w-none sm:max-w-[90%] px-4">
                        {/* Title Skeleton */}
                        <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6 animate-pulse" />

                        {/* Grid Skeleton */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                            {[1, 2, 3, 4, 5, 6].map((item) => (
                                <Card key={item} className="overflow-hidden border-gray-100 shadow-sm rounded-xl">
                                    {/* Image Placeholder */}
                                    <div className="aspect-square bg-gray-200 animate-pulse" />

                                    {/* Content Placeholder */}
                                    <div className="p-4 space-y-3">
                                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            ))}

            <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }
      `}</style>
        </div>
    );
}
