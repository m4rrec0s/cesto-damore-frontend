"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Additional,
  CustomizationAvailableOptions,
  CustomizationRule,
  CustomizationRuleInput,
  CustomizationTypeValue,
  Product,
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
import { cn } from "../../lib/utils";

type Mode = "product" | "additional";

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

interface CustomizationManagerProps {
  products: Product[];
  additionals: Additional[];
}

const TYPE_OPTIONS: { value: CustomizationTypeValue; label: string }[] = [
  { value: "PHOTO_UPLOAD", label: "Envio de fotos" },
  { value: "TEXT_INPUT", label: "Campo de texto" },
  { value: "MULTIPLE_CHOICE", label: "Opções múltiplas" },
  { value: "ITEM_SUBSTITUTION", label: "Substituição de itens" },
];

const DEFAULT_FORM: CustomizationRuleInput & { is_required: boolean } = {
  customization_type: "PHOTO_UPLOAD",
  title: "",
  description: "",
  is_required: false,
  max_items: null,
  available_options: null,
  display_order: undefined,
};

export function CustomizationManager({
  products,
  additionals,
}: CustomizationManagerProps) {
  const api = useApi();
  const [mode, setMode] = useState<Mode>("product");
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    products[0]?.id ?? null
  );
  const [selectedAdditionalId, setSelectedAdditionalId] = useState<
    string | null
  >(additionals[0]?.id ?? null);
  const [customizations, setCustomizations] = useState<CustomizationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomizationRule | null>(null);
  const [form, setForm] = useState<
    CustomizationRuleInput & { is_required: boolean }
  >(DEFAULT_FORM);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [advancedOptions, setAdvancedOptions] = useState("");
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => {
    const list = mode === "product" ? products : additionals;
    if (!search.trim()) return list;
    const normalized = search.trim().toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(normalized));
  }, [additionals, mode, products, search]);

  const selectedId =
    mode === "product" ? selectedProductId : selectedAdditionalId;

  const fetchCustomizations = useCallback(
    async (currentMode: Mode, id: string | null) => {
      if (!id) {
        setCustomizations([]);
        return;
      }
      setLoading(true);
      try {
        const data =
          currentMode === "product"
            ? await api.getProductCustomizations(id)
            : await api.getAdditionalCustomizations(id);
        setCustomizations(data);
      } catch (error) {
        console.error("Erro ao carregar customizações", error);
        toast.error(
          extractErrorMessage(
            error,
            "Não foi possível carregar as customizações"
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (mode === "product" && products.length > 0) {
      setSelectedProductId((prev) => prev ?? products[0].id);
    } else if (mode === "additional" && additionals.length > 0) {
      setSelectedAdditionalId((prev) => prev ?? additionals[0].id);
    }
  }, [additionals, mode, products]);

  useEffect(() => {
    fetchCustomizations(mode, selectedId);
  }, [fetchCustomizations, mode, selectedId]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setOptions([]);
    setAdvancedOptions("");
    setDialogOpen(true);
  };

  const openEditDialog = (rule: CustomizationRule) => {
    setEditing(rule);
    setForm({
      customization_type: rule.customization_type,
      title: rule.title,
      description: rule.description ?? "",
      is_required: rule.is_required,
      max_items: rule.max_items ?? null,
      available_options: rule.available_options ?? null,
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

  const handleDelete = async (rule: CustomizationRule) => {
    const confirmed = window.confirm(
      `Remover a customização "${rule.title}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      if (mode === "product" && selectedProductId) {
        await api.deleteProductCustomization(rule.id);
      } else if (mode === "additional" && selectedAdditionalId) {
        await api.deleteAdditionalCustomization(rule.id);
      }
      toast.success("Customização removida");
      fetchCustomizations(mode, selectedId);
    } catch (error) {
      console.error("Erro ao remover customização", error);
      toast.error(
        extractErrorMessage(error, "Não foi possível remover a customização")
      );
    }
  };

  const handleSubmit = async () => {
    if (!selectedId) {
      toast.error("Selecione um item para gerenciar customizações");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (form.customization_type === "MULTIPLE_CHOICE" && options.length === 0) {
      toast.error("Adicione ao menos uma opção para múltipla escolha");
      return;
    }

    let availableOptions: CustomizationAvailableOptions | null = null;

    if (form.customization_type === "MULTIPLE_CHOICE") {
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

    const payload: CustomizationRuleInput = {
      customization_type: form.customization_type,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      is_required: form.is_required,
      max_items:
        form.max_items === null || form.max_items === undefined
          ? null
          : Number(form.max_items),
      available_options: availableOptions,
      display_order:
        form.display_order === null || form.display_order === undefined
          ? undefined
          : Number(form.display_order),
    };

    setSaving(true);
    try {
      if (editing) {
        if (mode === "product") {
          await api.updateProductCustomization(editing.id, payload);
        } else {
          await api.updateAdditionalCustomization(editing.id, payload);
        }
        toast.success("Customização atualizada");
      } else {
        if (mode === "product") {
          await api.createProductCustomization(selectedId, payload);
        } else {
          await api.createAdditionalCustomization(selectedId, payload);
        }
        toast.success("Customização criada");
      }
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      setOptions([]);
      setAdvancedOptions("");
      fetchCustomizations(mode, selectedId);
    } catch (error) {
      console.error("Erro ao salvar customização", error);
      toast.error(
        extractErrorMessage(error, "Não foi possível salvar a customização")
      );
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
      prev.map((option) =>
        option.id === id
          ? {
              ...option,
              [key]:
                key === "price_adjustment" && value !== ""
                  ? Number(value)
                  : value,
            }
          : option
      )
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
    setOptions((prev) => prev.filter((option) => option.id !== id));
  };

  const selectedItemName = useMemo(() => {
    if (!selectedId) return null;
    if (mode === "product") {
      return (
        products.find((product) => product.id === selectedId)?.name || null
      );
    }
    return (
      additionals.find((additional) => additional.id === selectedId)?.name ||
      null
    );
  }, [additionals, mode, products, selectedId]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Wand2 className="h-6 w-6 text-purple-500" /> Gerenciador de
            customizações
          </h2>
          <p className="text-sm text-gray-500">
            Configure regras de personalização para produtos e adicionais em um
            único lugar, mantendo a lógica de negócios organizada.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white p-1">
          <button
            onClick={() => setMode("product")}
            className={cn(
              "rounded-full px-4 py-1 text-sm font-medium transition",
              mode === "product"
                ? "bg-purple-500 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            Produtos
          </button>
          <button
            onClick={() => setMode("additional")}
            className={cn(
              "rounded-full px-4 py-1 text-sm font-medium transition",
              mode === "additional"
                ? "bg-purple-500 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            Adicionais
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <Label
              htmlFor="customization-search"
              className="text-xs uppercase text-gray-500"
            >
              Buscar {mode === "product" ? "produtos" : "adicionais"}
            </Label>
            <Input
              id="customization-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Digite o nome do ${
                mode === "product" ? "produto" : "adicional"
              }`}
              className="mt-2"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {mode === "product" ? "Produtos" : "Adicionais"}
              </h3>
            </div>
            <div className="max-h-[440px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500">
                  Nenhum {mode === "product" ? "produto" : "adicional"}{" "}
                  encontrado.
                </p>
              ) : (
                <ul className="space-y-1 p-2">
                  {items.map((item) => {
                    const isActive = item.id === selectedId;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() =>
                            mode === "product"
                              ? setSelectedProductId(item.id)
                              : setSelectedAdditionalId(item.id)
                          }
                          className={cn(
                            "w-full rounded-xl border border-transparent px-4 py-3 text-left text-sm transition",
                            isActive
                              ? "bg-purple-50 text-purple-700 shadow-inner border-purple-200"
                              : "hover:bg-gray-50"
                          )}
                        >
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          {"description" in item && item.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {item.description}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedItemName || "Selecione um item"}
              </h3>
              <p className="text-sm text-gray-500">
                {customizations.length} customização(s) configuradas.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Nova customização
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : customizations.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-gray-500">
                <Wand2 className="h-8 w-8" />
                <p>Nenhuma customização cadastrada para este item.</p>
                <Button variant="ghost" size="sm" onClick={openCreateDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar primeira regra
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {customizations.map((rule) => (
                  <article
                    key={rule.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-sm"
                  >
                    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white text-xs">
                            {getTypeLabel(rule.customization_type)}
                          </Badge>
                          {rule.is_required && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              Obrigatória
                            </Badge>
                          )}
                        </div>
                        <h4 className="mt-2 text-base font-semibold text-gray-900">
                          {rule.title}
                        </h4>
                        {rule.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {rule.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                          className="gap-2"
                        >
                          <PencilLine className="h-4 w-4" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule)}
                          className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>
                    </header>

                    <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                      <div>
                        <span className="font-medium text-gray-700">
                          Máx. itens:
                        </span>{" "}
                        {rule.max_items ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Ordem de exibição:
                        </span>{" "}
                        {rule.display_order ?? "—"}
                      </div>
                    </div>

                    {renderAvailableOptions(rule.available_options)}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar customização" : "Nova customização"}
            </DialogTitle>
            <DialogDescription>
              Defina as regras de personalização exibidas para o cliente no
              momento da compra.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label htmlFor="customization-title">Título</Label>
                <Input
                  id="customization-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Ex.: Escolha a dedicatória"
                />
              </div>
              <div>
                <Label htmlFor="customization-description">Descrição</Label>
                <textarea
                  id="customization-description"
                  value={form.description ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Explique para o cliente o que deve ser informado"
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="customization-type">Tipo de customização</Label>
                <Select
                  value={form.customization_type}
                  onValueChange={(value: CustomizationTypeValue) => {
                    setForm((prev) => ({
                      ...prev,
                      customization_type: value,
                    }));
                    if (value !== "MULTIPLE_CHOICE") {
                      setOptions([]);
                    }
                  }}
                >
                  <SelectTrigger id="customization-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="customization-required"
                  type="checkbox"
                  checked={form.is_required}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      is_required: event.target.checked,
                    }))
                  }
                  aria-label="Customização obrigatória"
                  className="h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <Label
                  htmlFor="customization-required"
                  className="text-sm text-gray-600"
                >
                  Customização obrigatória
                </Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customization-max-items">
                    Máximo de itens
                  </Label>
                  <Input
                    id="customization-max-items"
                    type="number"
                    min={0}
                    value={form.max_items ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        max_items: value === "" ? null : Number(value),
                      }));
                    }}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label htmlFor="customization-display-order">
                    Ordem de exibição
                  </Label>
                  <Input
                    id="customization-display-order"
                    type="number"
                    min={0}
                    value={form.display_order ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        display_order: value === "" ? undefined : Number(value),
                      }));
                    }}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {form.customization_type === "MULTIPLE_CHOICE" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Opções disponíveis
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                    >
                      Adicionar opção
                    </Button>
                  </div>
                  {options.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Nenhuma opção cadastrada. Adicione itens para oferecer
                      escolhas ao cliente.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {options.map((option) => (
                        <div
                          key={option.id}
                          className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm md:grid-cols-[1fr,1fr,120px,auto]"
                        >
                          <Input
                            id={`option-label-${option.id}`}
                            placeholder="Rótulo"
                            value={option.label}
                            onChange={(event) =>
                              handleOptionChange(
                                option.id,
                                "label",
                                event.target.value
                              )
                            }
                          />
                          <Input
                            id={`option-value-${option.id}`}
                            placeholder="Valor interno"
                            value={option.value}
                            onChange={(event) =>
                              handleOptionChange(
                                option.id,
                                "value",
                                event.target.value
                              )
                            }
                          />
                          <Input
                            id={`option-price-${option.id}`}
                            type="number"
                            placeholder="Ajuste de preço"
                            value={option.price_adjustment ?? 0}
                            onChange={(event) =>
                              handleOptionChange(
                                option.id,
                                "price_adjustment",
                                event.target.value
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOption(option.id)}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.customization_type === "ITEM_SUBSTITUTION" && (
                <div className="space-y-2">
                  <Label htmlFor="customization-advanced-options">
                    Estrutura avançada (JSON)
                    <span className="block text-xs font-normal text-gray-500">
                      Informe itens e substituições no formato esperado pelo
                      sistema.
                    </span>
                  </Label>
                  <textarea
                    id="customization-advanced-options"
                    value={advancedOptions}
                    onChange={(event) => setAdvancedOptions(event.target.value)}
                    placeholder='{"items": [{"original_item": "Flor Vermelha", "available_substitutes": [{"item": "Flor Azul", "price_adjustment": 5}]}]}'
                    rows={8}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
              )}

              {form.customization_type === "PHOTO_UPLOAD" && (
                <p className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-xs text-purple-700">
                  Defina o número máximo de fotos que o cliente pode enviar,
                  usando o campo &quot;Máximo de itens&quot;.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              Salvar customização
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function getTypeLabel(type: CustomizationTypeValue) {
  return TYPE_OPTIONS.find((option) => option.value === type)?.label || type;
}

function renderAvailableOptions(
  options: CustomizationAvailableOptions | null | undefined
) {
  if (!options) return null;

  if (Array.isArray(options)) {
    return (
      <div className="mt-3 space-y-2 text-sm">
        <h5 className="font-medium text-gray-700">Opções</h5>
        <ul className="space-y-1">
          {options.map((option) => (
            <li
              key={`${option.value}-${option.label}`}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-gray-600"
            >
              <span>{option.label}</span>
              <span className="text-xs text-gray-500">
                Valor: {option.value}
                {option.price_adjustment
                  ? ` • Ajuste: R$ ${option.price_adjustment.toFixed(2)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1 text-sm">
      <h5 className="font-medium text-gray-700">Estrutura avançada</h5>
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
        {JSON.stringify(options, null, 2)}
      </pre>
    </div>
  );
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { error?: unknown } };
      }
    ).response;
    const message = response?.data?.error;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
