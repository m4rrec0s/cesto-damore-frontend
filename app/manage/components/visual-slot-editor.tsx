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
import {
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Move,
} from "lucide-react";
import type { SlotDef } from "@/app/types/personalization";

interface VisualSlotEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  slots: SlotDef[];
  onSlotsChange: (slots: SlotDef[]) => void;
}

// Helper: Rotacionar ponto em torno de um centro
const rotatePoint = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  angle: number
) => {
  const rad = (Math.PI / 180) * angle;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cos * (x - cx) - sin * (y - cy) + cx,
    y: sin * (x - cx) + cos * (y - cy) + cy,
  };
};

export default function VisualSlotEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  slots,
  onSlotsChange,
}: VisualSlotEditorProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Estados de interação
  const [interactionMode, setInteractionMode] = useState<
    "none" | "move" | "resize" | "rotate"
  >("none");
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSlotState, setInitialSlotState] = useState<SlotDef | null>(
    null
  );

  const calculateInitialZoom = () => {
    const maxDisplayHeight = 480;
    if (imageHeight > maxDisplayHeight) {
      return maxDisplayHeight / imageHeight;
    }
    return 1;
  };

  const [zoom, setZoom] = useState(calculateInitialZoom());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const getDirectImageUrl = (url: string): string => {
    if (!url || !url.includes("drive.google.com")) {
      return url;
    }

    if (url.includes("/uc?id=")) {
      return url.split("&")[0];
    }

    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      const fileId = match[1] || match[2];
      if (fileId) {
        return `https://drive.google.com/uc?id=${fileId}`;
      }
    }

    return url;
  };

  useEffect(() => {
    const img = new Image();
    const directImageUrl = getDirectImageUrl(imageUrl);
    const finalUrl = directImageUrl.includes("drive.google.com")
      ? `/api/proxy-image?url=${encodeURIComponent(directImageUrl)}`
      : directImageUrl;

    img.src = finalUrl;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      baseImageRef.current = img;
      setZoom(calculateInitialZoom());
      drawCanvas();
    };

    img.onerror = (error) => {
      console.error("❌ Erro ao carregar imagem do layout:", error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, imageHeight]);

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, selectedSlot, zoom]);

  const drawCanvas = () => {
    if (!canvasRef.current || !baseImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageWidth * zoom;
    canvas.height = imageHeight * zoom;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Desenhar Slots (ordenados por zIndex)
    const sortedSlots = [...slots].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
    );

    sortedSlots.forEach((slot) => {
      const x = (slot.x / 100) * canvas.width;
      const y = (slot.y / 100) * canvas.height;
      const w = (slot.width / 100) * canvas.width;
      const h = (slot.height / 100) * canvas.height;
      const rotation = slot.rotation || 0;

      ctx.save();

      // Rotacionar ao redor do centro do slot
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));

      const isSelected = slot.id === selectedSlot;

      // Preenchimento
      ctx.fillStyle = isSelected
        ? "rgba(59, 130, 246, 0.5)"
        : "rgba(200, 200, 200, 0.5)";
      ctx.fillRect(x, y, w, h);

      // Borda
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#9ca3af";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y, w, h);

      // Texto (ID)
      ctx.fillStyle = "#000";
      ctx.font = `${14 * zoom}px sans-serif`;
      ctx.fillText(slot.id, x + 5, y + 20);

      ctx.restore();
    });

    // 2. Desenhar Imagem Base (Overlay)
    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    // 3. Desenhar Handles de Seleção (Sempre por cima de tudo)
    if (selectedSlot) {
      const slot = slots.find((s) => s.id === selectedSlot);
      if (slot) {
        const x = (slot.x / 100) * canvas.width;
        const y = (slot.y / 100) * canvas.height;
        const w = (slot.width / 100) * canvas.width;
        const h = (slot.height / 100) * canvas.height;
        const rotation = slot.rotation || 0;

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));

        // Redesenhar borda de seleção por cima da imagem para visibilidade
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const handleSize = 10;
        const halfHandle = handleSize / 2;

        // Estilo dos handles
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1;

        // Handles de redimensionamento (Cantos)
        const handles = [
          { x: x - halfHandle, y: y - halfHandle }, // TL
          { x: x + w - halfHandle, y: y - halfHandle }, // TR
          { x: x - halfHandle, y: y + h - halfHandle }, // BL
          { x: x + w - halfHandle, y: y + h - halfHandle }, // BR
        ];

        handles.forEach((hPos) => {
          ctx.fillRect(hPos.x, hPos.y, handleSize, handleSize);
          ctx.strokeRect(hPos.x, hPos.y, handleSize, handleSize);
        });

        // Handle de Rotação (Topo)
        const rotHandleX = x + w / 2;
        const rotHandleY = y - 25; // Acima do slot

        // Linha conectando
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(rotHandleX, rotHandleY);
        ctx.strokeStyle = "#3b82f6";
        ctx.stroke();

        // Círculo de rotação
        ctx.beginPath();
        ctx.arc(rotHandleX, rotHandleY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }
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

  // Verificar se o clique foi em um handle
  const checkHandles = (
    mx: number,
    my: number,
    slot: SlotDef,
    canvas: HTMLCanvasElement
  ) => {
    const x = (slot.x / 100) * canvas.width;
    const y = (slot.y / 100) * canvas.height;
    const w = (slot.width / 100) * canvas.width;
    const h = (slot.height / 100) * canvas.height;
    const rotation = slot.rotation || 0;
    const cx = x + w / 2;
    const cy = y + h / 2;

    // Rotacionar mouse point para o sistema de coordenadas local do slot (sem rotação)
    // Para testar colisão com handles que desenhamos "rotacionados"
    // Na verdade, desenhamos o contexto rotacionado.
    // Então, se rotacionarmos o ponto do mouse pelo inverso do ângulo do slot em torno do centro,
    // podemos testar colisão como se o slot estivesse reto (0 graus).

    const localM = rotatePoint(mx, my, cx, cy, -rotation);

    const handleSize = 10;
    const hitRadius = handleSize; // Margem de erro

    // Rotação Handle (Topo Centro)
    // No sistema local, está em (x + w/2, y - 25)
    const rotX = x + w / 2;
    const rotY = y - 25;
    if (
      Math.abs(localM.x - rotX) <= hitRadius &&
      Math.abs(localM.y - rotY) <= hitRadius
    ) {
      return "rotate";
    }

    // Resize Handles
    // TL
    if (Math.abs(localM.x - x) <= hitRadius && Math.abs(localM.y - y) <= hitRadius)
      return "tl";
    // TR
    if (
      Math.abs(localM.x - (x + w)) <= hitRadius &&
      Math.abs(localM.y - y) <= hitRadius
    )
      return "tr";
    // BL
    if (
      Math.abs(localM.x - x) <= hitRadius &&
      Math.abs(localM.y - (y + h)) <= hitRadius
    )
      return "bl";
    // BR
    if (
      Math.abs(localM.x - (x + w)) <= hitRadius &&
      Math.abs(localM.y - (y + h)) <= hitRadius
    )
      return "br";

    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Verificar Handles do slot selecionado
    if (selectedSlot) {
      const slot = slots.find((s) => s.id === selectedSlot);
      if (slot) {
        const handle = checkHandles(coords.x, coords.y, slot, canvas);
        if (handle) {
          setInteractionMode(handle === "rotate" ? "rotate" : "resize");
          setActiveHandle(handle);
          setDragStart(coords);
          setInitialSlotState({ ...slot });
          return;
        }
      }
    }

    // 2. Verificar clique no corpo dos slots (para mover ou selecionar)
    // Iterar reverso (z-index maior primeiro)
    const sortedSlots = [...slots].sort(
      (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
    );

    for (const slot of sortedSlots) {
      const x = (slot.x / 100) * canvas.width;
      const y = (slot.y / 100) * canvas.height;
      const w = (slot.width / 100) * canvas.width;
      const h = (slot.height / 100) * canvas.height;
      const rotation = slot.rotation || 0;
      const cx = x + w / 2;
      const cy = y + h / 2;

      const localM = rotatePoint(coords.x, coords.y, cx, cy, -rotation);

      if (
        localM.x >= x &&
        localM.x <= x + w &&
        localM.y >= y &&
        localM.y <= y + h
      ) {
        setSelectedSlot(slot.id);
        setInteractionMode("move");
        setDragStart(coords);
        setInitialSlotState({ ...slot });
        return;
      }
    }

    // Clicou fora
    setSelectedSlot(null);
    setInteractionMode("none");
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Atualizar cursor
    if (interactionMode === "none") {
      // Lógica simples de cursor hover... poderia ser melhorada
      canvas.style.cursor = "default";
      if (selectedSlot) {
        const slot = slots.find((s) => s.id === selectedSlot);
        if (slot) {
          const handle = checkHandles(coords.x, coords.y, slot, canvas);
          if (handle) {
            canvas.style.cursor = handle === "rotate" ? "grab" : "pointer";
          } else {
            // Check body hover
            // ... (simplificado)
          }
        }
      }
    }

    if (interactionMode === "none" || !selectedSlot || !initialSlotState) return;

    const slot = slots.find((s) => s.id === selectedSlot);
    if (!slot) return;

    if (interactionMode === "move") {
      const dx = ((coords.x - dragStart.x) / canvas.width) * 100;
      const dy = ((coords.y - dragStart.y) / canvas.height) * 100;

      const newX = initialSlotState.x + dx;
      const newY = initialSlotState.y + dy;

      onSlotsChange(
        slots.map((s) =>
          s.id === selectedSlot ? { ...s, x: newX, y: newY } : s
        )
      );
    } else if (interactionMode === "rotate") {
      const x = (slot.x / 100) * canvas.width;
      const y = (slot.y / 100) * canvas.height;
      const w = (slot.width / 100) * canvas.width;
      const h = (slot.height / 100) * canvas.height;
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Calcular ângulo atual
      const angle = Math.atan2(coords.y - cy, coords.x - cx) * (180 / Math.PI);
      // Ajustar para que o topo seja -90 graus (ou 270)
      // O handle está em -90 graus relativo ao centro.
      // Então a rotação é angle + 90.
      const newRotation = Math.round(angle + 90);

      onSlotsChange(
        slots.map((s) =>
          s.id === selectedSlot ? { ...s, rotation: newRotation } : s
        )
      );
    } else if (interactionMode === "resize" && activeHandle) {
      // Lógica de redimensionamento com rotação
      // 1. Obter centro atual, largura e altura iniciais
      const initX = (initialSlotState.x / 100) * canvas.width;
      const initY = (initialSlotState.y / 100) * canvas.height;
      const initW = (initialSlotState.width / 100) * canvas.width;
      const initH = (initialSlotState.height / 100) * canvas.height;
      const initRot = initialSlotState.rotation || 0;
      const cx = initX + initW / 2;
      const cy = initY + initH / 2;

      // 2. Rotacionar o ponto atual do mouse para o sistema local do slot inicial
      const localM = rotatePoint(coords.x, coords.y, cx, cy, -initRot);
      const localStart = rotatePoint(dragStart.x, dragStart.y, cx, cy, -initRot);

      const dx = localM.x - localStart.x;
      const dy = localM.y - localStart.y;

      let newX = initX;
      let newY = initY;
      let newW = initW;
      let newH = initH;

      // Aplicar delta baseado no handle
      if (activeHandle === "br") {
        newW = initW + dx;
        newH = initH + dy;
      } else if (activeHandle === "bl") {
        newX = initX + dx;
        newW = initW - dx;
        newH = initH + dy;
      } else if (activeHandle === "tr") {
        newY = initY + dy;
        newW = initW + dx;
        newH = initH - dy;
      } else if (activeHandle === "tl") {
        newX = initX + dx;
        newY = initY + dy;
        newW = initW - dx;
        newH = initH - dy;
      }

      // Evitar dimensões negativas
      if (newW < 10) newW = 10;
      if (newH < 10) newH = 10;

      // Agora temos o novo rect (newX, newY, newW, newH) no sistema LOCAL (não rotacionado, mas centrado no antigo centro?)
      // Não, newX/newY são relativos ao canto superior esquerdo "local".
      // Precisamos recalcular o novo centro no sistema GLOBAL.

      // O centro do novo retângulo no sistema local é:
      const newLocalCx = newX + newW / 2;
      const newLocalCy = newY + newH / 2;

      // A diferença do centro antigo para o novo centro no sistema local
      const diffCx = newLocalCx - (initX + initW / 2);
      const diffCy = newLocalCy - (initY + initH / 2);

      // Rotacionar essa diferença para o sistema global
      const globalDiff = rotatePoint(diffCx, diffCy, 0, 0, initRot);

      // Novo centro global
      const newGlobalCx = cx + globalDiff.x;
      const newGlobalCy = cy + globalDiff.y;

      // Finalmente, converter de volta para Top-Left global (que é o que o SlotDef usa? Não, SlotDef usa X/Y que é top-left)
      // Mas espere, SlotDef X/Y é top-left do retângulo *não rotacionado*?
      // Sim, geralmente X/Y/W/H definem o box, e Rotation gira em torno do centro desse box.

      // Então o novo X/Y (top-left do box não rotacionado) é simplesmente:
      // newGlobalCx - newW / 2
      // newGlobalCy - newH / 2

      const finalX = newGlobalCx - newW / 2;
      const finalY = newGlobalCy - newH / 2;

      onSlotsChange(
        slots.map((s) =>
          s.id === selectedSlot
            ? {
              ...s,
              x: (finalX / canvas.width) * 100,
              y: (finalY / canvas.height) * 100,
              width: (newW / canvas.width) * 100,
              height: (newH / canvas.height) * 100,
            }
            : s
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setInteractionMode("none");
    setActiveHandle(null);
    setInitialSlotState(null);
  };

  const handleAddSlot = () => {
    const newSlot: SlotDef = {
      id: `slot_${Date.now()}`,
      x: 35,
      y: 35,
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
                className="border rounded-lg overflow-auto bg-gray-50 relative select-none"
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
                Clique e arraste para mover. Use os cantos para redimensionar e o círculo superior para rotacionar.
              </p>
            </div>

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
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={selectedSlotData.rotation || 0}
                          onChange={(e) =>
                            handleUpdateSlot(selectedSlotData.id, {
                              rotation: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <RotateCw className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Enviar para trás"
                        onClick={() =>
                          handleUpdateSlot(selectedSlotData.id, {
                            zIndex: (selectedSlotData.zIndex || 0) - 1,
                          })
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Trazer para frente"
                        onClick={() =>
                          handleUpdateSlot(selectedSlotData.id, {
                            zIndex: (selectedSlotData.zIndex || 0) + 1,
                          })
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
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
                        className={`p-2 rounded border cursor-pointer hover:bg-muted ${selectedSlot === slot.id
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
