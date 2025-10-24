"use client";

import { useState } from "react";
import { toast } from "sonner";
import useApi from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface MultipleChoiceOption {
  id: string;
  label: string;
  description?: string;
  price_modifier: number;
  // optional image metadata (admin can attach an image to an option)
  image_url?: string;
  image_filename?: string;
}

interface MultipleChoiceData {
  options: MultipleChoiceOption[];
  min_selection: number;
  max_selection: number;
}

interface Props {
  data: MultipleChoiceData;
  onChange: (data: MultipleChoiceData) => void;
}

export default function MultipleChoiceCustomizationForm({
  data,
  onChange,
}: Props) {
  const [options, setOptions] = useState<MultipleChoiceOption[]>(
    data.options || []
  );
  const api = useApi();
  const [minSelection, setMinSelection] = useState(data.min_selection || 1);
  const [maxSelection, setMaxSelection] = useState(
    data.max_selection || options.length || 1
  );

  const addOption = () => {
    const newOption: MultipleChoiceOption = {
      id: `option-${Date.now()}`,
      label: "",
      description: "",
      price_modifier: 0,
    };

    const updatedOptions = [...options, newOption];
    setOptions(updatedOptions);
    updateData(updatedOptions, minSelection, maxSelection);
  };

  const uploadOptionImage = async (index: number, file: File | null) => {
    if (!file) return;
    try {
      toast.info("Enviando imagem...");
      const res = await api.uploadCustomizationImage(file);
      const updated = options.map((opt, i) =>
        i === index
          ? {
              ...opt,
              image_url: res.imageUrl,
              image_filename: res.filename,
            }
          : opt
      );
      setOptions(updated);
      updateData(updated, minSelection, maxSelection);
      toast.success("Imagem enviada");
    } catch (err) {
      console.error("Erro ao enviar imagem da opção:", err);
      toast.error("Falha ao enviar imagem");
    }
  };

  const removeOptionImage = async (index: number) => {
    const opt = options[index];
    if (!opt) return;
    const filename = opt.image_filename;
    try {
      if (filename) {
        await api.deleteCustomizationImage(filename);
      }
    } catch (err) {
      console.warn("Falha ao deletar imagem no servidor:", err);
      // continue to remove locally anyway
    }

    const updated = options.map((o, i) =>
      i === index
        ? { ...o, image_url: undefined, image_filename: undefined }
        : o
    );
    setOptions(updated);
    updateData(updated, minSelection, maxSelection);
    toast.success("Imagem removida");
  };

  const updateOption = (
    index: number,
    updates: Partial<MultipleChoiceOption>
  ) => {
    const updatedOptions = options.map((option, i) =>
      i === index ? { ...option, ...updates } : option
    );
    setOptions(updatedOptions);
    updateData(updatedOptions, minSelection, maxSelection);
  };

  const removeOption = (index: number) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    setOptions(updatedOptions);
    updateData(updatedOptions, minSelection, maxSelection);
  };

  const updateData = (
    opts: MultipleChoiceOption[],
    min: number,
    max: number
  ) => {
    onChange({
      options: opts,
      min_selection: min,
      max_selection: max,
    });
  };

  const handleMinChange = (value: number) => {
    setMinSelection(value);
    updateData(options, value, maxSelection);
  };

  const handleMaxChange = (value: number) => {
    setMaxSelection(value);
    updateData(options, minSelection, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Opções de Múltipla Escolha
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Opção
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Mínimo de seleções</Label>
          <Input
            type="number"
            min="1"
            max={maxSelection}
            value={minSelection}
            onChange={(e) => handleMinChange(parseInt(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Máximo de seleções</Label>
          <Input
            type="number"
            min={minSelection}
            max={options.length || 1}
            value={maxSelection}
            onChange={(e) => handleMaxChange(parseInt(e.target.value))}
          />
        </div>
      </div>

      {options.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          Nenhuma opção adicionada. Clique em &quot;Adicionar Opção&quot; para
          começar.
        </Card>
      ) : (
        <div className="space-y-3">
          {options.map((option, index) => (
            <Card key={option.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Opção {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Rótulo</Label>
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        updateOption(index, { label: e.target.value })
                      }
                      placeholder="Ex: Tamanho Grande"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Preço adicional (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={option.price_modifier}
                      onChange={(e) =>
                        updateOption(index, {
                          price_modifier: parseFloat(e.target.value),
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Input
                    value={option.description || ""}
                    onChange={(e) =>
                      updateOption(index, { description: e.target.value })
                    }
                    placeholder="Informação adicional sobre a opção..."
                  />
                </div>
                {/* Image for option */}
                <div className="space-y-1">
                  <Label className="text-xs">Imagem (opcional)</Label>
                  <div className="flex items-center space-x-3">
                    {option.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={option.image_url}
                        alt={`Preview da opção ${index + 1}`}
                        className="h-16 w-16 rounded object-cover border"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded border bg-muted" />
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        aria-label={`Enviar imagem para a opção ${index + 1}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          uploadOptionImage(index, e.target.files?.[0] ?? null)
                        }
                      />

                      {option.image_url && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeOptionImage(index)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
