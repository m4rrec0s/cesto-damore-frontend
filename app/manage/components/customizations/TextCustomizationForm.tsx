"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Card } from "@/app/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface TextField {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  max_length?: number;
}

interface TextCustomizationData {
  fields: TextField[];
}

interface Props {
  data: TextCustomizationData;
  onChange: (data: TextCustomizationData) => void;
}

export default function TextCustomizationForm({ data, onChange }: Props) {
  const [fields, setFields] = useState<TextField[]>(data.fields || []);

  const addField = () => {
    const newField: TextField = {
      id: `field-${Date.now()}`,
      label: "",
      placeholder: "",
      required: false,
    };

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    onChange({ fields: updatedFields });
  };

  const updateField = (index: number, updates: Partial<TextField>) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    onChange({ fields: updatedFields });
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    onChange({ fields: updatedFields });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Campos de Texto Personalizados
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Campo
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          Nenhum campo adicionado. Clique em &quot;Adicionar Campo&quot; para
          começar.
        </Card>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Campo {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Rótulo</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                      placeholder="Ex: Nome do destinatário"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      value={field.placeholder}
                      onChange={(e) =>
                        updateField(index, { placeholder: e.target.value })
                      }
                      placeholder="Ex: Digite o nome..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Máximo de caracteres</Label>
                    <Input
                      type="number"
                      min="1"
                      value={field.max_length || ""}
                      onChange={(e) =>
                        updateField(index, {
                          max_length: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="Sem limite"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(index, { required: checked })
                      }
                    />
                    <Label className="text-xs">Campo obrigatório</Label>
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
