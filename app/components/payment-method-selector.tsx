"use client";

import { Card } from "@/app/components/ui/card";
import { motion } from "framer-motion";

interface PaymentMethodSelectorProps {
  selectedMethod: "pix" | "card";
  onMethodChange: (method: "pix" | "card") => void;
}

// SVG Icons
const PixIcon = () => (
  <svg
    className="w-8 h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6v6H9z" />
    <path d="M9 3v6M15 3v6M9 15v6M15 15v6" />
  </svg>
);

const CardIcon = () => (
  <svg
    className="w-8 h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  const methods = [
    {
      id: "pix" as const,
      label: "PIX",
      description: "Transferência instantânea",
      icon: PixIcon,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "card" as const,
      label: "Cartão de Crédito",
      description: "Visa, Mastercard, Elo...",
      icon: CardIcon,
      color: "from-rose-500 to-pink-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;

        return (
          <motion.button
            key={method.id}
            onClick={() => onMethodChange(method.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative text-left"
          >
            <Card
              className={`p-5 h-full cursor-pointer transition-all duration-300 border-2 ${
                isSelected
                  ? `border-current bg-gradient-to-br ${method.color} bg-opacity-10`
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="payment-indicator"
                  className="absolute inset-0 border-2 border-current rounded-lg"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    isSelected
                      ? `bg-gradient-to-br ${method.color} text-white`
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {method.label}
                  </h3>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.button>
        );
      })}
    </div>
  );
}
