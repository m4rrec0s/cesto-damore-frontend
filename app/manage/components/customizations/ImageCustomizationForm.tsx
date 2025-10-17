"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";

interface ImageCustomizationData {
  base_layout: {
    max_images: number;
    min_width?: number;
    min_height?: number;
    max_file_size_mb?: number;
    accepted_formats?: string[];
  };
}

interface Props {
  data: ImageCustomizationData;
  onChange: (data: ImageCustomizationData) => void;
}

export default function ImageCustomizationForm({ data, onChange }: Props) {
  const [baseLayout, setBaseLayout] = useState(
    data.base_layout || {
      max_images: 5,
      min_width: 800,
      min_height: 800,
      max_file_size_mb: 10,
      accepted_formats: ["image/jpeg", "image/png", "image/webp"],
    }
  );

  const updateLayout = (updates: Partial<typeof baseLayout>) => {
    const updated = { ...baseLayout, ...updates };
    setBaseLayout(updated);
    onChange({ base_layout: updated });
  };

  const formatOptions = [
    { value: "image/jpeg", label: "JPEG" },
    { value: "image/png", label: "PNG" },
    { value: "image/webp", label: "WebP" },
    { value: "image/gif", label: "GIF" },
  ];

  const toggleFormat = (format: string) => {
    const current = baseLayout.accepted_formats || [];
    const updated = current.includes(format)
      ? current.filter((f) => f !== format)
      : [...current, format];

    updateLayout({ accepted_formats: updated });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">
        Configurações de Upload de Imagens
      </Label>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Máximo de imagens</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={baseLayout.max_images}
              onChange={(e) =>
                updateLayout({ max_images: parseInt(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Número máximo de imagens que o cliente pode fazer upload
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Tamanho máximo (MB)</Label>
            <Input
              type="number"
              min="1"
              max="50"
              value={baseLayout.max_file_size_mb}
              onChange={(e) =>
                updateLayout({ max_file_size_mb: parseInt(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Tamanho máximo por arquivo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Largura mínima (px)</Label>
            <Input
              type="number"
              min="100"
              value={baseLayout.min_width || ""}
              onChange={(e) =>
                updateLayout({
                  min_width: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Altura mínima (px)</Label>
            <Input
              type="number"
              min="100"
              value={baseLayout.min_height || ""}
              onChange={(e) =>
                updateLayout({
                  min_height: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Formatos aceitos</Label>
          <div className="grid grid-cols-2 gap-2">
            {formatOptions.map((format) => (
              <label
                key={format.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={baseLayout.accepted_formats?.includes(format.value)}
                  onChange={() => toggleFormat(format.value)}
                  className="rounded"
                />
                <span className="text-sm">{format.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
