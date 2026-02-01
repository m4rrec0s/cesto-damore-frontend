"use client";

import React from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check, Sparkles } from "lucide-react";
import { Model3DViewer } from "../produto/[id]/components/Model3DViewer";

interface CustomizationPreviewCardProps {
  previewUrl: string;
  layoutName?: string;
  modelUrl?: string;
  itemType?: string;
  layoutWidth?: number;
  layoutHeight?: number;
  onEdit?: () => void;
}

export default function CustomizationPreviewCard({
  previewUrl,
  layoutName,
  modelUrl,
  itemType = "caneca",
  layoutWidth = 800,
  layoutHeight = 800,
  onEdit,
}: CustomizationPreviewCardProps) {
  const defaultModelUrl =
    itemType.toLowerCase() === "caneca"
      ? "/3DModels/caneca.glb"
      : "/3DModels/quadro.glb";

  const finalModelUrl = modelUrl || defaultModelUrl;

  return (
    <Card className="mt-4 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden shadow-lg">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border-b border-purple-200">
          <div className="p-2 rounded-lg bg-purple-100">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <h3 className="font-bold text-gray-900">
                Personalização Aplicada
              </h3>
            </div>
            {layoutName && (
              <p className="text-sm text-gray-600 mt-1">Layout: {layoutName}</p>
            )}
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors underline"
            >
              Editar
            </button>
          )}
        </div>

        <div className="p-4">
          <div
            className="relative rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200"
            style={{ height: "400px" }}
          >
            <Model3DViewer
              modelUrl={finalModelUrl}
              materialColor="#ffffff"
              textures={
                itemType.toLowerCase() === "caneca"
                  ? [
                      {
                        areaId: "preview",
                        imageUrl: previewUrl,
                        position: { x: 0, y: 0.35, z: 0 },
                        dimensions: {
                          width: (layoutWidth / layoutHeight) * 0.95,
                          height: 0.95,
                        },
                        mapping: "cylinder",
                        cylinder: {
                          radius: 0.46,
                          height: 0.95,
                          segments: 200,
                        },
                      },
                    ]
                  : [
                      {
                        areaId: "preview",
                        imageUrl: previewUrl,
                        position: { x: 0, y: 0, z: 0.05 },
                        dimensions: { width: 1, height: 0.7 },
                        mapping: "plane",
                      },
                    ]
              }
              className="h-full w-full"
              autoRotate={true}
              rotateSpeed={0.3}
            />
          </div>
        </div>

        <div className="p-4 bg-white/60 border-t border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Pronto para adicionar ao carrinho
              </Badge>
            </div>
            <p className="text-xs text-gray-600">
              Preview 3D • Rotação horizontal
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
