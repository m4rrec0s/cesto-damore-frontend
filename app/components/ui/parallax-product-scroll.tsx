"use client";
import { useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/app/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image_url: string | null;
  categories?: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
}

interface ParallaxProductScrollProps {
  items: Product[];
  renderCard: (item: Product) => React.ReactNode;
  className?: string;
}

export const ParallaxProductScroll = ({
  items,
  renderCard,
  className,
}: ParallaxProductScrollProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: gridRef,
    offset: ["start start", "end start"],
  });

  const translateFirst = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const translateSecond = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const translateThird = useTransform(scrollYProgress, [0, 1], [0, -200]);

  const third = Math.ceil(items.length / 3);

  const firstPart = items.slice(0, third);
  const secondPart = items.slice(third, 2 * third);
  const thirdPart = items.slice(2 * third);

  return (
    <div
      className={cn("h-[50vh] items-start overflow-y-auto w-full", className)}
      ref={gridRef}
    >
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start max-w-5xl mx-auto gap-4 py-8 px-4"
        ref={gridRef}
      >
        <div className="grid gap-4">
          {firstPart.map((item) => (
            <motion.div
              style={{ y: translateFirst }}
              key={`product-1-${item.id}`}
            >
              {renderCard(item)}
            </motion.div>
          ))}
        </div>
        <div className="grid gap-4">
          {secondPart.map((item) => (
            <motion.div
              style={{ y: translateSecond }}
              key={`product-2-${item.id}`}
            >
              {renderCard(item)}
            </motion.div>
          ))}
        </div>
        <div className="grid gap-4">
          {thirdPart.map((item) => (
            <motion.div
              style={{ y: translateThird }}
              key={`product-3-${item.id}`}
            >
              {renderCard(item)}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
