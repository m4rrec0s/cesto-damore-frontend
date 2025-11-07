"use client";

import { useState } from "react";
import { Button } from "./button";
import { cn } from "@/app/lib/utils";

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

const presetColors = [
  "#FFFFFF", // Branco
  "#000000", // Preto
  "#F43F5E", // Rose
  "#EF4444", // Red
  "#F97316", // rose
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#22C55E", // Green
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#9CA3AF", // Gray
];

export function ColorPicker({
  value = "#FFFFFF",
  onChange,
  label,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);

  const handleColorSelect = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        {/* Seletor nativo de cor */}
        <div className="relative">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="h-10 w-16 cursor-pointer rounded border border-gray-300"
            title="Selecionar cor"
            aria-label="Seletor de cor"
          />
        </div>

        {/* Input de texto para o código hex */}
        <input
          type="text"
          value={customColor}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val) || val === "") {
              setCustomColor(val);
              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                onChange(val);
              }
            }
          }}
          placeholder="#FFFFFF"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-mono uppercase w-28"
        />

        {/* Cor atual */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-10 w-10 rounded border-2 border-gray-300",
              `bg-[${customColor}]`
            )}
          />
          <span className="text-xs text-gray-500">Atual</span>
        </div>
      </div>

      {/* Cores predefinidas */}
      <div>
        <p className="text-xs text-gray-600 mb-2">Cores predefinidas:</p>
        <div className="grid grid-cols-10 gap-1.5">
          {presetColors.map((color) => (
            <Button
              key={color}
              type="button"
              onClick={() => handleColorSelect(color)}
              className={`h-8 w-8 rounded border-2 transition-all hover:scale-110 ${
                customColor === color
                  ? "border-rose-500 ring-2 ring-rose-200"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
