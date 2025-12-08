"use client";

import React from "react";
import { motion } from "motion/react";

export function AnimatedFramesLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Pincel desenhando um quadro */}
      <div className="relative w-32 h-32">
        {/* Canvas/Quadro background */}
        <motion.div
          className="absolute inset-0 bg-white border-4 border-purple-400 rounded-lg shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Moldura sendo desenhada */}
        <svg
          className="absolute inset-0 w-32 h-32"
          viewBox="0 0 128 128"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Linha superior */}
          <motion.line
            x1="16"
            y1="16"
            x2="112"
            y2="16"
            className="text-purple-600"
            variants={{
              hidden: { pathLength: 0 },
              visible: { pathLength: 1 },
            }}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />

          {/* Linha direita */}
          <motion.line
            x1="112"
            y1="16"
            x2="112"
            y2="112"
            className="text-purple-600"
            variants={{
              hidden: { pathLength: 0 },
              visible: { pathLength: 1 },
            }}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              delay: 0.3,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />

          {/* Linha inferior */}
          <motion.line
            x1="112"
            y1="112"
            x2="16"
            y2="112"
            className="text-purple-600"
            variants={{
              hidden: { pathLength: 0 },
              visible: { pathLength: 1 },
            }}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              delay: 0.6,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />

          {/* Linha esquerda */}
          <motion.line
            x1="16"
            y1="112"
            x2="16"
            y2="16"
            className="text-purple-600"
            variants={{
              hidden: { pathLength: 0 },
              visible: { pathLength: 1 },
            }}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              delay: 0.9,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />

          {/* Pincelada decorativa interna */}
          <motion.path
            d="M 32 40 Q 64 32 96 48"
            className="text-pink-500"
            variants={{
              hidden: { pathLength: 0 },
              visible: { pathLength: 1 },
            }}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.5,
              delay: 1.2,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />

          {/* Pincelada decorativa 2 */}
          <motion.path
            d="M 40 70 Q 64 60 88 80"
            className="text-pink-500"
            variants={{
              hidden: { pathLength: 0 },
              visible: { pathLength: 1 },
            }}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.5,
              delay: 1.4,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          />
        </svg>

        {/* Pincel animado */}
        <motion.div
          className="absolute w-6 h-6 pointer-events-none"
          initial={{ x: 100, y: 10, rotate: -45 }}
          animate={{
            x: [100, 100, 100, 10, 10, 10, 10, 100],
            y: [10, 100, 100, 100, 100, 10, 10, 10],
            rotate: [-45, -45, -45, -45, 0, 0, -45, -45],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.15, 0.35, 0.45, 0.55, 0.75, 0.85, 1],
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-6 h-6 text-purple-600"
          >
            <path
              d="M 12 20 Q 10 15 12 10 Q 14 15 12 20"
              fill="currentColor"
              className="text-purple-500"
            />
            <line x1="12" y1="10" x2="12" y2="2" strokeWidth="1.5" />
          </svg>
        </motion.div>
      </div>

      {/* Texto animado */}
      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Salvando sua personalização...
        </p>
        <motion.p
          className="text-sm text-gray-600 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Desenhando seus detalhes 🎨
        </motion.p>
      </motion.div>
    </div>
  );
}
