"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Plus, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import type { SlotDef } from "@/app/types/personalization";

interface VisualSlotEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  slots: SlotDef[];
  onSlotsChange: (slots: SlotDef[]) => void;
}

export default function VisualSlotEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  slots,
  onSlotsChange,
}: VisualSlotEditorProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calcular zoom inicial para que a imagem caiba na visualização (max 500px de altura)
  const calculateInitialZoom = () => {
    const maxDisplayHeight = 480; // um pouco menor que maxHeight do container (500px)
    if (imageHeight > maxDisplayHeight) {
      return maxDisplayHeight / imageHeight;
    }
    return 1;
  };

  const [zoom, setZoom] = useState(calculateInitialZoom());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  /**
   * Garante que a URL do Google Drive esteja no formato correto
   * Aceita vários formatos e normaliza para: https://drive.google.com/uc?id={FILE_ID}
   */
  const getDirectImageUrl = (url: string): string => {
    if (!url || !url.includes("drive.google.com")) {
      return url; // URL local ou de outro serviço
    }

    // Se já estiver no formato correto, retornar
    if (url.includes("/uc?id=")) {
      return url.split("&")[0]; // Remove parâmetros extras como &export=download
    }

    // Extrair FILE_ID de diferentes formatos de URL do Google Drive
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      const fileId = match[1] || match[2];
      if (fileId) {
        return `https://drive.google.com/uc?id=${fileId}`;
      }
    }

    return url; // Fallback para URL original
  };

  // Carregar imagem base
  useEffect(() => {
    const img = new Image();

    // Google Drive requer crossOrigin
    if (imageUrl.includes("drive.google.com")) {
      img.crossOrigin = "anonymous";
    }

    // Converter URL de visualização para URL de imagem direta
    const directImageUrl = getDirectImageUrl(imageUrl);
    img.src = directImageUrl;

    img.onload = () => {
      baseImageRef.current = img;
      // Recalcular zoom quando a imagem carregar
      setZoom(calculateInitialZoom());
      drawCanvas();
    };

    img.onerror = (error) => {
      console.error("❌ Erro ao carregar imagem do layout:", error);
      console.log("URL da imagem:", imageUrl);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, imageHeight]);

  // Redesenhar quando slots mudarem
  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, selectedSlot, zoom]);

  const drawCanvas = () => {
    if (!canvasRef.current || !baseImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar tamanho do canvas
    canvas.width = imageWidth * zoom;
    canvas.height = imageHeight * zoom;

    // Limpar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar imagem base
    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    // Desenhar slots
    slots.forEach((slot) => {
      const x = (slot.x / 100) * canvas.width;
      const y = (slot.y / 100) * canvas.height;
      const w = (slot.width / 100) * canvas.width;
      const h = (slot.height / 100) * canvas.height;

      const isSelected = slot.id === selectedSlot;

      // Slot background
      ctx.fillStyle = isSelected
        ? "rgba(59, 130, 246, 0.3)"
        : "rgba(251, 146, 60, 0.3)";
      ctx.fillRect(x, y, w, h);

      // Slot border
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#fb923c";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      // Slot label
      ctx.fillStyle = "#000";
      ctx.font = `${14 * zoom}px sans-serif`;
      ctx.fillText(slot.id, x + 5, y + 20);

      // Resize handles se selecionado
      if (isSelected) {
        ctx.fillStyle = "#3b82f6";
        const handleSize = 8 * zoom;
        // Top-left
        ctx.fillRect(
          x - handleSize / 2,
          y - handleSize / 2,
          handleSize,
          handleSize
        );
        // Top-right
        ctx.fillRect(
          x + w - handleSize / 2,
          y - handleSize / 2,
          handleSize,
          handleSize
        );
        // Bottom-left
        ctx.fillRect(
          x - handleSize / 2,
          y + h - handleSize / 2,
          handleSize,
          handleSize
        );
        // Bottom-right
        ctx.fillRect(
          x + w - handleSize / 2,
          y + h - handleSize / 2,
          handleSize,
          handleSize
        );
      }
    });
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);

    // Verificar se clicou em um slot
    for (const slot of slots) {
      const x =
        (slot.x / 100) * (canvasRef.current?.width || imageWidth * zoom);
      const y =
        (slot.y / 100) * (canvasRef.current?.height || imageHeight * zoom);
      const w =
        (slot.width / 100) * (canvasRef.current?.width || imageWidth * zoom);
      const h =
        (slot.height / 100) * (canvasRef.current?.height || imageHeight * zoom);

      if (
        coords.x >= x &&
        coords.x <= x + w &&
        coords.y >= y &&
        coords.y <= y + h
      ) {
        setSelectedSlot(slot.id);
        setIsDragging(true);
        setDragStart({ x: coords.x - x, y: coords.y - y });
        return;
      }
    }

    // Se não clicou em nenhum slot, desselecionar
    setSelectedSlot(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedSlot || !canvasRef.current) return;

    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;

    const newSlots = slots.map((slot) => {
      if (slot.id === selectedSlot) {
        const newX = ((coords.x - dragStart.x) / canvas.width) * 100;
        const newY = ((coords.y - dragStart.y) / canvas.height) * 100;

        return {
          ...slot,
          x: Math.max(0, Math.min(100 - slot.width, newX)),
          y: Math.max(0, Math.min(100 - slot.height, newY)),
        };
      }
      return slot;
    });

    onSlotsChange(newSlots);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleAddSlot = () => {
    const newSlot: SlotDef = {
      id: `slot_${Date.now()}`,
      x: 10,
      y: 10,
      width: 30,
      height: 30,
      rotation: 0,
      zIndex: slots.length,
    };
    onSlotsChange([...slots, newSlot]);
    setSelectedSlot(newSlot.id);
  };

  const handleDeleteSlot = (slotId: string) => {
    onSlotsChange(slots.filter((s) => s.id !== slotId));
    if (selectedSlot === slotId) {
      setSelectedSlot(null);
    }
  };

  const handleUpdateSlot = (slotId: string, updates: Partial<SlotDef>) => {
    onSlotsChange(
      slots.map((s) => (s.id === slotId ? { ...s, ...updates } : s))
    );
  };

  const selectedSlotData = slots.find((s) => s.id === selectedSlot);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Editor Visual de Slots</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-normal px-2 py-1">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button type="button" onClick={handleAddSlot} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Slot
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Canvas */}
            <div className="lg:col-span-2">
              <div
                ref={containerRef}
                className="border rounded-lg overflow-auto bg-gray-50"
                style={{ maxHeight: "500px", maxWidth: "100%" }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className="cursor-crosshair"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Clique e arraste os slots para reposicioná-los. Use os controles
                na lateral para ajustar precisamente.
              </p>
            </div>

            {/* Controles do Slot Selecionado */}
            <div className="space-y-4">
              {selectedSlotData ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Slot: {selectedSlotData.id}</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSlot(selectedSlotData.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>ID do Slot</Label>
                      <Input
                        value={selectedSlotData.id}
                        onChange={(e) =>
                          handleUpdateSlot(selectedSlotData.id, {
                            id: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>X (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedSlotData.x.toFixed(1)}
                          onChange={(e) =>
                            handleUpdateSlot(selectedSlotData.id, {
                              x: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Y (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedSlotData.y.toFixed(1)}
                          onChange={(e) =>
                            handleUpdateSlot(selectedSlotData.id, {
                              y: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Largura (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedSlotData.width.toFixed(1)}
                          onChange={(e) =>
                            handleUpdateSlot(selectedSlotData.id, {
                              width: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Altura (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedSlotData.height.toFixed(1)}
                          onChange={(e) =>
                            handleUpdateSlot(selectedSlotData.id, {
                              height: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Rotação (graus)</Label>
                      <Input
                        type="number"
                        value={selectedSlotData.rotation || 0}
                        onChange={(e) =>
                          handleUpdateSlot(selectedSlotData.id, {
                            rotation: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Z-Index</Label>
                      <Input
                        type="number"
                        value={selectedSlotData.zIndex || 0}
                        onChange={(e) =>
                          handleUpdateSlot(selectedSlotData.id, {
                            zIndex: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>Selecione um slot no canvas para editá-lo</p>
                    <p className="text-sm mt-2">
                      ou clique em &quot;Adicionar Slot&quot; para criar um novo
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Lista de Slots */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Todos os Slots ({slots.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-auto">
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum slot adicionado
                    </p>
                  ) : (
                    slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-2 rounded border cursor-pointer hover:bg-muted ${
                          selectedSlot === slot.id
                            ? "border-primary bg-muted"
                            : ""
                        }`}
                        onClick={() => setSelectedSlot(slot.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{slot.id}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlot(slot.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ({slot.x.toFixed(1)}%, {slot.y.toFixed(1)}%) -{" "}
                          {slot.width.toFixed(1)}% × {slot.height.toFixed(1)}%
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
