"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Loader2,
  PencilLine,
  PlusCircle,
  Trash2,
  Wand2,
} from "lucide-react";
import type {
  CustomizationAvailableOptions,
  CustomizationTypeValue,
  Type,
} from "../../hooks/use-api";
import { useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface ProductRule {
  id: string;
  product_type_id: string;
  rule_type: CustomizationTypeValue;
  title: string;
  description?: string;
  required: boolean;
  max_items?: number | null;
  available_options?: CustomizationAvailableOptions | null;
  conflict_with?: string | null;
  dependencies?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

type OptionItem = {
  id: string;
  label: string;
  value: string;
  price_adjustment?: number;
};

const createOptionId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `option-${Math.random().toString(36).slice(2, 10)}`;

interface ProductRuleManagerProps {
  productTypes: Type[];
}

const TYPE_OPTIONS: { value: CustomizationTypeValue; label: string }[] = [
  { value: "PHOTO_UPLOAD", label: "Envio de fotos" },
  { value: "TEXT_INPUT", label: "Campo de texto" },
  { value: "MULTIPLE_CHOICE", label: "Opções múltiplas" },
  { value: "ITEM_SUBSTITUTION", label: "Substituição de itens" },
];

const DEFAULT_FORM = {
  rule_type: "PHOTO_UPLOAD" as CustomizationTypeValue,
  title: "",
  description: "",
  required: false,
  max_items: null as number | null,
  available_options: null as CustomizationAvailableOptions | null,
  conflict_with: [] as string[],
  dependencies: [] as string[],
  display_order: 0,
};

export function ProductRuleManager({ productTypes }: ProductRuleManagerProps) {
  const api = useApi();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    productTypes[0]?.id ?? null
  );
  const [rules, setRules] = useState<ProductRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRule | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [advancedOptions, setAdvancedOptions] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(
    async (typeId: string | null) => {
      if (!typeId) {
        setRules([]);
        return;
      }
      setLoading(true);
      try {
        const data = await api.getProductRulesByType(typeId);
        setRules(data);
      } catch (error) {
        console.error("Erro ao carregar regras", error);
        toast.error("Não foi possível carregar as regras de customização");
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (selectedTypeId) {
      fetchRules(selectedTypeId);
    }
  }, [fetchRules, selectedTypeId]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setOptions([]);
    setAdvancedOptions("");
    setDialogOpen(true);
  };

  const openEditDialog = (rule: ProductRule) => {
    setEditing(rule);
    setForm({
      rule_type: rule.rule_type,
      title: rule.title,
      description: rule.description || "",
      required: rule.required,
      max_items: rule.max_items ?? null,
      available_options: rule.available_options ?? null,
      conflict_with: rule.conflict_with ? JSON.parse(rule.conflict_with) : [],
      dependencies: rule.dependencies ? JSON.parse(rule.dependencies) : [],
      display_order: rule.display_order,
    });

    if (Array.isArray(rule.available_options)) {
      setOptions(
        rule.available_options.map((option, index) => ({
          id: `${rule.id}-${index}`,
          label: option.label,
          value: option.value,
          price_adjustment: option.price_adjustment,
        }))
      );
      setAdvancedOptions("");
    } else if (rule.available_options) {
      setOptions([]);
      setAdvancedOptions(JSON.stringify(rule.available_options, null, 2));
    } else {
      setOptions([]);
      setAdvancedOptions("");
    }

    setDialogOpen(true);
  };

  const handleDelete = async (rule: ProductRule) => {
    const confirmed = window.confirm(
      `Remover a regra "${rule.title}"? Essa ação não pode ser desfeita e afetará todos os produtos deste tipo.`
    );
    if (!confirmed) return;

    try {
      await api.deleteProductRule(rule.id);
      toast.success("Regra removida com sucesso");
      fetchRules(selectedTypeId);
    } catch (error) {
      console.error("Erro ao remover regra", error);
      toast.error("Não foi possível remover a regra");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTypeId) {
      toast.error("Selecione um tipo de produto");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (form.rule_type === "MULTIPLE_CHOICE" && options.length === 0) {
      toast.error("Adicione ao menos uma opção para múltipla escolha");
      return;
    }

    let availableOptions: CustomizationAvailableOptions | null = null;

    if (form.rule_type === "MULTIPLE_CHOICE") {
      availableOptions = options.map(({ label, value, price_adjustment }) => ({
        label: label.trim(),
        value: value.trim(),
        price_adjustment: price_adjustment ?? 0,
      }));
    } else if (advancedOptions.trim()) {
      try {
        availableOptions = JSON.parse(advancedOptions);
      } catch {
        toast.error("JSON de opções avançadas inválido");
        return;
      }
    }

    const payload = {
      product_type_id: selectedTypeId,
      rule_type: form.rule_type,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      required: form.required,
      max_items: form.max_items === null ? null : Number(form.max_items),
      available_options: availableOptions,
      conflict_with: form.conflict_with.length > 0 ? form.conflict_with : null,
      dependencies: form.dependencies.length > 0 ? form.dependencies : null,
      display_order: Number(form.display_order) || 0,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.updateProductRule(editing.id, payload);
        toast.success("Regra atualizada com sucesso");
      } else {
        await api.createProductRule(payload);
        toast.success("Regra criada com sucesso");
      }
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      setOptions([]);
      setAdvancedOptions("");
      fetchRules(selectedTypeId);
    } catch (error) {
      console.error("Erro ao salvar regra", error);
      toast.error("Não foi possível salvar a regra");
    } finally {
      setSaving(false);
    }
  };

  const handleOptionChange = (
    id: string,
    key: keyof Omit<OptionItem, "id">,
    value: string
  ) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== id) return opt;
        if (key === "price_adjustment") {
          const num = parseFloat(value);
          return { ...opt, [key]: isNaN(num) ? 0 : num };
        }
        return { ...opt, [key]: value };
      })
    );
  };

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        id: createOptionId(),
        label: "",
        value: "",
        price_adjustment: 0,
      },
    ]);
  };

  const handleRemoveOption = (id: string) => {
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  const selectedTypeName =
    productTypes.find((t) => t.id === selectedTypeId)?.name ||
    "Selecione um tipo";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Regras de Customização</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie regras centralizadas por tipo de produto
          </p>
        </div>
      </div>

      {/* Seleção de Tipo */}
      <div className="bg-card rounded-lg border p-4">
        <Label htmlFor="type-select" className="text-sm font-medium mb-2 block">
          Tipo de Produto
        </Label>
        <Select value={selectedTypeId || ""} onValueChange={setSelectedTypeId}>
          <SelectTrigger id="type-select" className="w-full max-w-md">
            <SelectValue placeholder="Selecione um tipo de produto" />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Regras */}
      {selectedTypeId && (
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Regras de {selectedTypeName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rules.length} {rules.length === 1 ? "regra" : "regras"}{" "}
                configuradas
              </p>
            </div>
            <Button onClick={openCreateDialog} size="sm">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nova Regra
            </Button>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma regra configurada para este tipo</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={openCreateDialog}
                >
                  Criar primeira regra
                </Button>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{rule.title}</h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {TYPE_OPTIONS.find((t) => t.value === rule.rule_type)
                            ?.label || rule.rule_type}
                        </Badge>
                        {rule.required && (
                          <Badge variant="default" className="text-xs shrink-0">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {rule.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {rule.max_items && (
                          <span>Máx: {rule.max_items} itens</span>
                        )}
                        <span>Ordem: {rule.display_order}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(rule)}
                      >
                        <PencilLine className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Regra" : "Nova Regra de Customização"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os campos da regra de customização"
                : "Configure uma nova regra para este tipo de produto"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de Regra */}
            <div className="space-y-2">
              <Label htmlFor="rule_type">Tipo de Customização</Label>
              <Select
                value={form.rule_type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    rule_type: value as CustomizationTypeValue,
                  }))
                }
              >
                <SelectTrigger id="rule_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Fotos para a caneca"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Explique como o cliente deve usar esta customização"
              />
            </div>

            {/* Obrigatório */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="required"
                checked={form.required}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, required: e.target.checked }))
                }
                className="rounded border-gray-300"
                aria-label="Customização obrigatória"
              />
              <Label htmlFor="required" className="font-normal cursor-pointer">
                Esta customização é obrigatória
              </Label>
            </div>

            {/* Máximo de Itens */}
            {(form.rule_type === "PHOTO_UPLOAD" ||
              form.rule_type === "MULTIPLE_CHOICE") && (
              <div className="space-y-2">
                <Label htmlFor="max_items">Máximo de Itens</Label>
                <Input
                  id="max_items"
                  type="number"
                  min="1"
                  value={form.max_items ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      max_items: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Ex: 4 fotos no máximo"
                />
              </div>
            )}

            {/* Opções (Múltipla Escolha) */}
            {form.rule_type === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                <Label>Opções Disponíveis</Label>
                <div className="space-y-2">
                  {options.map((opt) => (
                    <div key={opt.id} className="flex gap-2 items-start">
                      <Input
                        placeholder="Rótulo"
                        value={opt.label}
                        onChange={(e) =>
                          handleOptionChange(opt.id, "label", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Valor"
                        value={opt.value}
                        onChange={(e) =>
                          handleOptionChange(opt.id, "value", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="R$ ajuste"
                        value={opt.price_adjustment ?? 0}
                        onChange={(e) =>
                          handleOptionChange(
                            opt.id,
                            "price_adjustment",
                            e.target.value
                          )
                        }
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(opt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Adicionar Opção
                  </Button>
                </div>
              </div>
            )}

            {/* Opções Avançadas (JSON) */}
            {form.rule_type === "ITEM_SUBSTITUTION" && (
              <div className="space-y-2">
                <Label htmlFor="advanced_options">
                  Opções Avançadas (JSON)
                </Label>
                <Input
                  id="advanced_options"
                  value={advancedOptions}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAdvancedOptions(e.target.value)
                  }
                  placeholder='{"items": [...]}'
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Ordem de Exibição */}
            <div className="space-y-2">
              <Label htmlFor="display_order">Ordem de Exibição</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={form.display_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    display_order: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Ordem em que aparece para o cliente (menor primeiro)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editing ? (
                "Atualizar"
              ) : (
                "Criar Regra"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
