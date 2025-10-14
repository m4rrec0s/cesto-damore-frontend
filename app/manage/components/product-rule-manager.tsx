"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  BadgeCheck,
  Loader2,
  PencilLine,
  PlusCircle,
  Trash2,
  Wand2,
} from "lucide-react";
import type { Type as ProductType } from "../../hooks/use-api";
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
import {
  LayoutPreset,
  LayoutWithPhotos,
  ProductRule,
  ProductRuleInput,
  RuleType,
  SelectOption,
  isLayoutPresetArray,
  isLayoutWithPhotosArray,
  isSelectOptionArray,
  isSubstitutionOptions,
} from "../../types/customization";

interface ProductRuleManagerProps {
  productTypes: ProductType[];
}

type SelectOptionForm = SelectOption & { tempId: string };
type LayoutPresetForm = LayoutPreset & { tempId: string };
type LayoutWithPhotosForm = LayoutWithPhotos & { tempId: string };

const RULE_LABELS: Record<RuleType, string> = {
  PHOTO_UPLOAD: "Envio de fotos",
  LAYOUT_PRESET: "Layout pronto",
  LAYOUT_WITH_PHOTOS: "Layout com fotos",
  TEXT_INPUT: "Campo de texto",
  OPTION_SELECT: "Opção seletiva",
  ITEM_SUBSTITUTION: "Substituição de item",
};

const RULE_DESCRIPTIONS: Partial<Record<RuleType, string>> = {
  PHOTO_UPLOAD: "Cliente envia imagens livres para anexar ao pedido.",
  LAYOUT_PRESET: "Cliente escolhe um layout pronto com imagem ilustrativa.",
  LAYOUT_WITH_PHOTOS:
    "Cliente seleciona um layout específico e envia as fotos exigidas pelos slots.",
  TEXT_INPUT: "Campo livre para mensagem personalizada.",
  OPTION_SELECT: "Lista de opções simples (ex: cores, temas, frases).",
  ITEM_SUBSTITUTION:
    "Configuração avançada para permitir substituição de itens por equivalentes.",
};

const DEFAULT_FORM = {
  rule_type: "LAYOUT_PRESET" as RuleType,
  title: "",
  description: "",
  required: false,
  max_items: "",
  conflict_with: "",
  dependencies: "",
  display_order: "",
  preview_image_url: "",
};

const createTempId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tmp-${Math.random().toString(36).slice(2, 10)}`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || `op-${Math.random().toString(36).slice(2, 8)}`;

const textAreaClass =
  "min-h-[120px] rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2";

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
  const [selectOptions, setSelectOptions] = useState<SelectOptionForm[]>([]);
  const [layoutPresets, setLayoutPresets] = useState<LayoutPresetForm[]>([]);
  const [layoutWithPhotos, setLayoutWithPhotos] = useState<
    LayoutWithPhotosForm[]
  >([]);
  const [advancedOptions, setAdvancedOptions] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Mapas para armazenar arquivos de imagem de cada layout
  const [layoutPresetImages, setLayoutPresetImages] = useState<
    Map<string, File>
  >(new Map());
  const [layoutPresetPreviews, setLayoutPresetPreviews] = useState<
    Map<string, string>
  >(new Map());
  const [layoutWithPhotosImages, setLayoutWithPhotosImages] = useState<
    Map<string, File>
  >(new Map());
  const [layoutWithPhotosPreviews, setLayoutWithPhotosPreviews] = useState<
    Map<string, string>
  >(new Map());

  const fetchRules = useCallback(
    async (typeId: string | null) => {
      if (!typeId) {
        setRules([]);
        return;
      }
      setLoading(true);
      try {
        const data = await api.getProductRulesByType(typeId);
        setRules(
          Array.isArray(data)
            ? data.sort(
                (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
              )
            : []
        );
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
    fetchRules(selectedTypeId);
  }, [fetchRules, selectedTypeId]);

  useEffect(() => {
    if (!selectedTypeId && productTypes.length > 0) {
      setSelectedTypeId(productTypes[0].id);
    }
  }, [productTypes, selectedTypeId]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setSelectOptions([]);
    setLayoutPresets([]);
    setLayoutWithPhotos([]);
    setAdvancedOptions("");
    setImageFile(null);
    setImagePreview(null);
    setLayoutPresetImages(new Map());
    setLayoutPresetPreviews(new Map());
    setLayoutWithPhotosImages(new Map());
    setLayoutWithPhotosPreviews(new Map());
    setDialogOpen(true);
  };

  const openEditDialog = (rule: ProductRule) => {
    setEditing(rule);
    setForm({
      rule_type: rule.rule_type,
      title: rule.title,
      description: rule.description ?? "",
      required: rule.required,
      max_items: rule.max_items != null ? String(rule.max_items) : "",
      conflict_with: rule.conflict_with?.join(", ") ?? "",
      dependencies: rule.dependencies?.join(", ") ?? "",
      display_order:
        rule.display_order != null ? String(rule.display_order) : "",
      preview_image_url: rule.preview_image_url ?? "",
    });
    setSelectOptions([]);
    setLayoutPresets([]);
    setLayoutWithPhotos([]);
    setAdvancedOptions("");
    setImageFile(null);
    setImagePreview(form.preview_image_url || null);
    setLayoutPresetImages(new Map());
    setLayoutPresetPreviews(new Map());
    setLayoutWithPhotosImages(new Map());
    setLayoutWithPhotosPreviews(new Map());

    if (rule.available_options && isSelectOptionArray(rule.available_options)) {
      setSelectOptions(
        rule.available_options.map((option, index) => ({
          ...option,
          tempId: `${rule.id}-select-${index}`,
          id: option.id ?? slugify(option.value || option.label),
          label: option.label,
          value: option.value,
          price_adjustment: option.price_adjustment ?? 0,
        }))
      );
    } else if (
      rule.available_options &&
      isLayoutPresetArray(rule.available_options)
    ) {
      setLayoutPresets(
        rule.available_options.map((option, index) => ({
          ...option,
          tempId: `${rule.id}-preset-${index}`,
          id: option.id ?? slugify(option.name),
          description: option.description ?? "",
          price_adjustment: option.price_adjustment ?? 0,
        }))
      );
    } else if (
      rule.available_options &&
      isLayoutWithPhotosArray(rule.available_options)
    ) {
      setLayoutWithPhotos(
        rule.available_options.map((option, index) => ({
          ...option,
          tempId: `${rule.id}-layout-${index}`,
          id: option.id ?? slugify(option.name),
          description: option.description ?? "",
          price_adjustment: option.price_adjustment ?? 0,
          photo_slots: option.photo_slots ?? 1,
        }))
      );
    } else if (rule.available_options) {
      setAdvancedOptions(JSON.stringify(rule.available_options, null, 2));
    }

    setDialogOpen(true);
  };

  const handleRuleTypeChange = (value: RuleType) => {
    setForm((prev) => ({ ...prev, rule_type: value }));
    setSelectOptions([]);
    setLayoutPresets([]);
    setLayoutWithPhotos([]);
    setAdvancedOptions("");
  };

  const handleSelectOptionChange = (
    tempId: string,
    key: keyof Omit<SelectOptionForm, "tempId">,
    value: string
  ) => {
    setSelectOptions((prev) =>
      prev.map((option) =>
        option.tempId === tempId
          ? {
              ...option,
              [key]:
                key === "price_adjustment"
                  ? value === ""
                    ? 0
                    : Number(value)
                  : value,
            }
          : option
      )
    );
  };

  const handleLayoutPresetChange = (
    tempId: string,
    key: keyof Omit<LayoutPresetForm, "tempId">,
    value: string
  ) => {
    setLayoutPresets((prev) =>
      prev.map((preset) =>
        preset.tempId === tempId
          ? {
              ...preset,
              [key]:
                key === "price_adjustment"
                  ? value === ""
                    ? 0
                    : Number(value)
                  : value,
            }
          : preset
      )
    );
  };

  const handleLayoutWithPhotosChange = (
    tempId: string,
    key: keyof Omit<LayoutWithPhotosForm, "tempId">,
    value: string
  ) => {
    setLayoutWithPhotos((prev) =>
      prev.map((layout) =>
        layout.tempId === tempId
          ? {
              ...layout,
              [key]:
                key === "price_adjustment"
                  ? value === ""
                    ? 0
                    : Number(value)
                  : key === "photo_slots"
                  ? Math.max(1, Number(value) || 1)
                  : value,
            }
          : layout
      )
    );
  };

  const addSelectOption = () => {
    setSelectOptions((prev) => [
      ...prev,
      {
        tempId: createTempId(),
        id: "",
        label: "",
        value: "",
        price_adjustment: 0,
        image_url: "",
      },
    ]);
  };

  const addLayoutPreset = () => {
    setLayoutPresets((prev) => [
      ...prev,
      {
        tempId: createTempId(),
        id: "",
        name: "",
        description: "",
        preview_image_url: "",
        price_adjustment: 0,
      },
    ]);
  };

  const addLayoutWithPhotos = () => {
    setLayoutWithPhotos((prev) => [
      ...prev,
      {
        tempId: createTempId(),
        id: "",
        name: "",
        description: "",
        preview_image_url: "",
        photo_slots: 1,
        price_adjustment: 0,
      },
    ]);
  };

  const removeSelectOption = (tempId: string) => {
    setSelectOptions((prev) =>
      prev.filter((option) => option.tempId !== tempId)
    );
  };

  const removeLayoutPreset = (tempId: string) => {
    setLayoutPresets((prev) =>
      prev.filter((preset) => preset.tempId !== tempId)
    );
    // Remover imagem associada
    setLayoutPresetImages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
    setLayoutPresetPreviews((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
  };

  const removeLayoutWithPhotos = (tempId: string) => {
    setLayoutWithPhotos((prev) =>
      prev.filter((layout) => layout.tempId !== tempId)
    );
    // Remover imagem associada
    setLayoutWithPhotosImages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
    setLayoutWithPhotosPreviews((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas arquivos de imagem são permitidos");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }
      setImageFile(file);
      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm((prev) => ({ ...prev, preview_image_url: "" }));
  };

  const handleLayoutPresetImageChange = (
    tempId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas arquivos de imagem são permitidos");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }

      setLayoutPresetImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(tempId, file);
        return newMap;
      });

      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setLayoutPresetPreviews((prev) => {
          const newMap = new Map(prev);
          newMap.set(tempId, reader.result as string);
          return newMap;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLayoutPresetImage = (tempId: string) => {
    setLayoutPresetImages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
    setLayoutPresetPreviews((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
    // Limpar URL também
    handleLayoutPresetChange(tempId, "preview_image_url", "");
  };

  const handleLayoutWithPhotosImageChange = (
    tempId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas arquivos de imagem são permitidos");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }

      setLayoutWithPhotosImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(tempId, file);
        return newMap;
      });

      // Criar preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setLayoutWithPhotosPreviews((prev) => {
          const newMap = new Map(prev);
          newMap.set(tempId, reader.result as string);
          return newMap;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLayoutWithPhotosImage = (tempId: string) => {
    setLayoutWithPhotosImages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
    setLayoutWithPhotosPreviews((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tempId);
      return newMap;
    });
    // Limpar URL também
    handleLayoutWithPhotosChange(tempId, "preview_image_url", "");
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

    let availableOptions: ProductRuleInput["available_options"] = null;

    if (form.rule_type === "OPTION_SELECT") {
      if (selectOptions.length === 0) {
        toast.error("Adicione ao menos uma opção");
        return;
      }
      availableOptions = selectOptions.map((option) => {
        const label = option.label.trim();
        const value = option.value.trim() || slugify(label);
        return {
          id: option.id?.trim() || slugify(value || label),
          label,
          value,
          price_adjustment: option.price_adjustment ?? 0,
          image_url: option.image_url?.trim() || undefined,
        };
      });
    } else if (form.rule_type === "LAYOUT_PRESET") {
      if (layoutPresets.length === 0) {
        toast.error("Cadastre ao menos um layout pronto");
        return;
      }
      availableOptions = layoutPresets.map((preset, index) => ({
        id: preset.id.trim() || slugify(preset.name || `layout-${index}`),
        name: preset.name.trim(),
        description: preset.description?.trim() || undefined,
        preview_image_url: preset.preview_image_url.trim(),
        price_adjustment: preset.price_adjustment ?? 0,
      }));
    } else if (form.rule_type === "LAYOUT_WITH_PHOTOS") {
      if (layoutWithPhotos.length === 0) {
        toast.error("Cadastre ao menos um layout com fotos");
        return;
      }
      const hasInvalidLayout = layoutWithPhotos.some(
        (layout) =>
          !layout.preview_image_url.trim() ||
          !layout.name.trim() ||
          !layout.photo_slots ||
          layout.photo_slots <= 0
      );
      if (hasInvalidLayout) {
        toast.error(
          "Preencha nome, imagem de preview e quantidade de fotos para cada layout"
        );
        return;
      }
      availableOptions = layoutWithPhotos.map((layout, index) => ({
        id: layout.id.trim() || slugify(layout.name || `layout-${index}`),
        name: layout.name.trim(),
        description: layout.description?.trim() || undefined,
        preview_image_url: layout.preview_image_url.trim(),
        photo_slots: Math.max(1, layout.photo_slots || 1),
        price_adjustment: layout.price_adjustment ?? 0,
      }));
    } else if (form.rule_type === "ITEM_SUBSTITUTION") {
      if (!advancedOptions.trim()) {
        toast.error("Informe a estrutura de substituição em JSON");
        return;
      }
      try {
        availableOptions = JSON.parse(advancedOptions);
      } catch {
        toast.error("JSON inválido. Verifique a estrutura informada.");
        return;
      }
    }

    const conflictWith = form.conflict_with
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const dependencies = form.dependencies
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const maxItems =
      form.max_items.trim() === "" ? null : Number(form.max_items.trim());
    const displayOrder =
      form.display_order.trim() === "" ? 0 : Number(form.display_order.trim());

    const payload: ProductRuleInput = {
      product_type_id: selectedTypeId,
      rule_type: form.rule_type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      required: form.required,
      max_items: Number.isNaN(maxItems) ? null : maxItems,
      conflict_with: conflictWith.length > 0 ? conflictWith : null,
      dependencies: dependencies.length > 0 ? dependencies : null,
      available_options: availableOptions,
      preview_image_url: form.preview_image_url.trim() || undefined,
      display_order: Number.isNaN(displayOrder) ? 0 : displayOrder,
    };

    setSaving(true);
    try {
      // Upload de imagens dos layouts (se houver)
      if (form.rule_type === "LAYOUT_PRESET" && layoutPresetImages.size > 0) {
        toast.info("Fazendo upload das imagens dos layouts...");
        for (const preset of layoutPresets) {
          const imageFile = layoutPresetImages.get(preset.tempId);
          if (!imageFile) continue;

          try {
            const { imageUrl } = await api.uploadCustomizationImage(imageFile);
            if (!imageUrl) {
              throw new Error("Resposta sem URL da imagem");
            }
            preset.preview_image_url = imageUrl;
          } catch (error) {
            console.error("Erro ao enviar imagem do layout preset", error);
            toast.error(`Falha ao enviar imagem do layout "${preset.name}"`);
            throw error;
          }
        }
      }

      if (
        form.rule_type === "LAYOUT_WITH_PHOTOS" &&
        layoutWithPhotosImages.size > 0
      ) {
        toast.info("Fazendo upload das imagens dos layouts...");
        for (const layout of layoutWithPhotos) {
          const imageFile = layoutWithPhotosImages.get(layout.tempId);
          if (!imageFile) continue;

          try {
            const { imageUrl } = await api.uploadCustomizationImage(imageFile);
            if (!imageUrl) {
              throw new Error("Resposta sem URL da imagem");
            }
            layout.preview_image_url = imageUrl;
          } catch (error) {
            console.error("Erro ao enviar imagem do layout", error);
            toast.error(`Falha ao enviar imagem do layout "${layout.name}"`);
            throw error;
          }
        }
      }

      // Atualizar availableOptions com as URLs das imagens já enviadas
      if (form.rule_type === "LAYOUT_PRESET") {
        availableOptions = layoutPresets.map((preset, index) => ({
          id: preset.id.trim() || slugify(preset.name || `layout-${index}`),
          name: preset.name.trim(),
          description: preset.description?.trim() || undefined,
          preview_image_url: preset.preview_image_url.trim(),
          price_adjustment: preset.price_adjustment ?? 0,
        }));
      } else if (form.rule_type === "LAYOUT_WITH_PHOTOS") {
        availableOptions = layoutWithPhotos.map((layout, index) => ({
          id: layout.id.trim() || slugify(layout.name || `layout-${index}`),
          name: layout.name.trim(),
          description: layout.description?.trim() || undefined,
          preview_image_url: layout.preview_image_url.trim(),
          photo_slots: Math.max(1, layout.photo_slots || 1),
          price_adjustment: layout.price_adjustment ?? 0,
        }));
      }

      // Se há arquivo de imagem para a regra principal, criar FormData
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("product_type_id", selectedTypeId);
        formData.append("rule_type", form.rule_type);
        formData.append("title", form.title.trim());
        if (form.description.trim()) {
          formData.append("description", form.description.trim());
        }
        formData.append("required", String(form.required));
        if (maxItems !== null && !Number.isNaN(maxItems)) {
          formData.append("max_items", String(maxItems));
        }
        if (conflictWith.length > 0) {
          formData.append("conflict_with", JSON.stringify(conflictWith));
        }
        if (dependencies.length > 0) {
          formData.append("dependencies", JSON.stringify(dependencies));
        }
        if (availableOptions) {
          formData.append(
            "available_options",
            JSON.stringify(availableOptions)
          );
        }
        formData.append("display_order", String(displayOrder));

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
        const token = localStorage.getItem("appToken");
        const headers = {
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        if (editing) {
          await axios.put(
            `${apiUrl}/admin/customization/rule/${editing.id}`,
            formData,
            { headers }
          );
          toast.success("Regra atualizada com sucesso");
        } else {
          await axios.post(`${apiUrl}/admin/customization/rule`, formData, {
            headers,
          });
          toast.success("Regra criada com sucesso");
        }
      } else {
        // Atualizar payload com availableOptions que pode ter URLs de imagens dos layouts
        const updatedPayload: ProductRuleInput = {
          ...payload,
          available_options: availableOptions,
        };

        // Envio normal sem imagem na regra principal
        if (editing) {
          await api.updateProductRule(editing.id, updatedPayload);
          toast.success("Regra atualizada com sucesso");
        } else {
          await api.createProductRule(updatedPayload);
          toast.success("Regra criada com sucesso");
        }
      }
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      setSelectOptions([]);
      setLayoutPresets([]);
      setLayoutWithPhotos([]);
      setAdvancedOptions("");
      setImageFile(null);
      setImagePreview(null);
      setLayoutPresetImages(new Map());
      setLayoutPresetPreviews(new Map());
      setLayoutWithPhotosImages(new Map());
      setLayoutWithPhotosPreviews(new Map());
      fetchRules(selectedTypeId);
    } catch (error) {
      console.error("Erro ao salvar regra", error);
      toast.error("Não foi possível salvar a regra");
    } finally {
      setSaving(false);
    }
  };

  const selectedTypeName =
    productTypes.find((type) => type.id === selectedTypeId)?.name ||
    "Selecione um tipo";

  const rulesToDisplay = useMemo(
    () =>
      [...rules].sort((a, b) => {
        return (a.display_order ?? 0) - (b.display_order ?? 0);
      }),
    [rules]
  );

  function renderRuleOptionSummary(
    rule: ProductRule
  ): import("react").ReactNode {
    if (!rule.available_options) return null;

    switch (rule.rule_type) {
      case "OPTION_SELECT":
        if (isSelectOptionArray(rule.available_options)) {
          return (
            <div className="text-xs text-muted-foreground">
              Opções:{" "}
              {rule.available_options.map((opt) => opt.label).join(", ")}
            </div>
          );
        }
        break;
      case "LAYOUT_PRESET":
        if (isLayoutPresetArray(rule.available_options)) {
          return (
            <div className="text-xs text-muted-foreground">
              Layouts:{" "}
              {rule.available_options.map((opt) => opt.name).join(", ")}
            </div>
          );
        }
        break;
      case "LAYOUT_WITH_PHOTOS":
        if (isLayoutWithPhotosArray(rule.available_options)) {
          return (
            <div className="text-xs text-muted-foreground">
              Layouts:{" "}
              {rule.available_options
                .map((opt) => `${opt.name} (${opt.photo_slots} fotos)`)
                .join(", ")}
            </div>
          );
        }
        break;
      case "ITEM_SUBSTITUTION":
        if (isSubstitutionOptions(rule.available_options)) {
          return (
            <div className="text-xs text-muted-foreground">
              Substituições configuradas
            </div>
          );
        }
        break;
      default:
        return null;
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Regras de Customização</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie layouts, campos e uploads específicos para cada tipo de
            produto.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova regra
        </Button>
      </div>

      {productTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-purple-300 bg-purple-50 p-6 text-center text-purple-700">
          Cadastre um tipo de produto antes de configurar regras de
          customização.
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg border p-4">
            <Label
              htmlFor="type-select"
              className="text-sm font-medium mb-2 block"
            >
              Tipo de produto
            </Label>
            <Select
              value={selectedTypeId ?? ""}
              onValueChange={(value) => setSelectedTypeId(value)}
            >
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

          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  Regras para {selectedTypeName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rules.length} {rules.length === 1 ? "regra" : "regras"}{" "}
                  configuradas
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rulesToDisplay.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma regra configurada ainda.</p>
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
              <div className="divide-y">
                {rulesToDisplay.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className="font-semibold text-lg truncate">
                            {rule.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {RULE_LABELS[rule.rule_type]}
                          </Badge>
                          {rule.required && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              <BadgeCheck className="w-3 h-3 mr-1" />{" "}
                              Obrigatória
                            </Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Ordem: {rule.display_order}</span>
                          {rule.max_items ? (
                            <span>Máx. itens: {rule.max_items}</span>
                          ) : null}
                          {rule.conflict_with &&
                          Array.isArray(rule.conflict_with) &&
                          rule.conflict_with.length ? (
                            <span>
                              Conflitos: {rule.conflict_with.join(", ")}
                            </span>
                          ) : null}
                          {rule.dependencies &&
                          Array.isArray(rule.dependencies) &&
                          rule.dependencies.length ? (
                            <span>
                              Depende de: {rule.dependencies.join(", ")}
                            </span>
                          ) : null}
                        </div>
                        {renderRuleOptionSummary(rule)}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                        >
                          <PencilLine className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(rule)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wand2 className="w-5 h-5 text-purple-500" />
              {editing ? "Editar regra" : "Nova regra"}
            </DialogTitle>
            <DialogDescription>
              Configure a experiência de customização exibida para os produtos
              deste tipo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rule-title">Título</Label>
                <Input
                  id="rule-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ex: Escolha seu layout"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-type">Tipo de regra</Label>
                <Select
                  value={form.rule_type}
                  onValueChange={(value) =>
                    handleRuleTypeChange(value as RuleType)
                  }
                >
                  <SelectTrigger id="rule-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-description">Descrição</Label>
              <textarea
                id="rule-description"
                className={textAreaClass}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Explique ao cliente como preencher esta customização."
              />
            </div>

            {RULE_DESCRIPTIONS[form.rule_type] && (
              <div className="rounded-md border border-dashed border-purple-200 bg-purple-50/50 p-3 text-xs text-purple-700">
                {RULE_DESCRIPTIONS[form.rule_type]}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <input
                  id="rule-required"
                  type="checkbox"
                  title="Marque como obrigatório"
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={form.required}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      required: event.target.checked,
                    }))
                  }
                />
                <Label htmlFor="rule-required" className="text-sm font-medium">
                  Obrigatório
                </Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-preview">Imagem de Preview</Label>
                <div className="space-y-2">
                  {imagePreview && (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-24 w-24 rounded-md object-cover border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={clearImage}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  <Input
                    id="rule-preview-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500">
                    Ou cole a URL da imagem abaixo:
                  </p>
                  <Input
                    id="rule-preview"
                    value={form.preview_image_url}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        preview_image_url: event.target.value,
                      }))
                    }
                    placeholder="https://exemplo.com/imagem.jpg"
                    disabled={!!imageFile}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rule-max-items">Quantidade máxima</Label>
                <Input
                  id="rule-max-items"
                  value={form.max_items}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      max_items: event.target.value,
                    }))
                  }
                  type="number"
                  min={0}
                  placeholder="Opcional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-display-order">Ordem de exibição</Label>
                <Input
                  id="rule-display-order"
                  value={form.display_order}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      display_order: event.target.value,
                    }))
                  }
                  type="number"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rule-conflicts">Conflitos</Label>
                <Input
                  id="rule-conflicts"
                  value={form.conflict_with}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      conflict_with: event.target.value,
                    }))
                  }
                  placeholder="IDs separados por vírgula"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rule-dependencies">Dependências</Label>
                <Input
                  id="rule-dependencies"
                  value={form.dependencies}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dependencies: event.target.value,
                    }))
                  }
                  placeholder="IDs separados por vírgula"
                />
              </div>
            </div>

            {form.rule_type === "OPTION_SELECT" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Opções disponíveis
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSelectOption}
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Adicionar opção
                  </Button>
                </div>
                {selectOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma opção cadastrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectOptions.map((option) => (
                      <div
                        key={option.tempId}
                        className="grid gap-3 rounded-lg border border-dashed border-gray-200 p-3 sm:grid-cols-[2fr,2fr,1fr,auto]"
                      >
                        <Input
                          value={option.label}
                          placeholder="Título"
                          onChange={(event) =>
                            handleSelectOptionChange(
                              option.tempId,
                              "label",
                              event.target.value
                            )
                          }
                        />
                        <Input
                          value={option.value}
                          placeholder="Valor interno"
                          onChange={(event) =>
                            handleSelectOptionChange(
                              option.tempId,
                              "value",
                              event.target.value
                            )
                          }
                        />
                        <Input
                          value={String(option.price_adjustment ?? 0)}
                          type="number"
                          placeholder="Ajuste R$"
                          onChange={(event) =>
                            handleSelectOptionChange(
                              option.tempId,
                              "price_adjustment",
                              event.target.value
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 justify-start"
                          onClick={() => removeSelectOption(option.tempId)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                        <Input
                          value={option.image_url ?? ""}
                          placeholder="Imagem (opcional)"
                          className="sm:col-span-3"
                          onChange={(event) =>
                            handleSelectOptionChange(
                              option.tempId,
                              "image_url",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.rule_type === "LAYOUT_PRESET" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Layouts prontos</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLayoutPreset}
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Adicionar layout
                  </Button>
                </div>
                {layoutPresets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Defina os layouts disponíveis para seleção.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {layoutPresets.map((preset) => (
                      <div
                        key={preset.tempId}
                        className="rounded-lg border border-dashed border-gray-200 p-4 space-y-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-[2fr,2fr,1fr,auto]">
                          <Input
                            value={preset.name}
                            placeholder="Nome do layout"
                            onChange={(event) =>
                              handleLayoutPresetChange(
                                preset.tempId,
                                "name",
                                event.target.value
                              )
                            }
                          />
                          <Input
                            value={String(preset.price_adjustment ?? 0)}
                            type="number"
                            placeholder="Ajuste R$"
                            onChange={(event) =>
                              handleLayoutPresetChange(
                                preset.tempId,
                                "price_adjustment",
                                event.target.value
                              )
                            }
                          />
                          <div className="sm:col-span-2">
                            <Input
                              value={preset.description ?? ""}
                              placeholder="Descrição (opcional)"
                              onChange={(event) =>
                                handleLayoutPresetChange(
                                  preset.tempId,
                                  "description",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Imagem do Layout</Label>
                          {layoutPresetPreviews.has(preset.tempId) && (
                            <div className="relative inline-block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={layoutPresetPreviews.get(preset.tempId)}
                                alt="Preview"
                                className="h-24 w-24 rounded-md object-cover border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={() =>
                                  clearLayoutPresetImage(preset.tempId)
                                }
                              >
                                ×
                              </Button>
                            </div>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleLayoutPresetImageChange(preset.tempId, e)
                            }
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-gray-500">
                            Ou cole a URL da imagem:
                          </p>
                          <Input
                            value={preset.preview_image_url}
                            placeholder="https://exemplo.com/imagem.jpg"
                            onChange={(event) =>
                              handleLayoutPresetChange(
                                preset.tempId,
                                "preview_image_url",
                                event.target.value
                              )
                            }
                            disabled={layoutPresetImages.has(preset.tempId)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-red-500 hover:text-red-600"
                          onClick={() => removeLayoutPreset(preset.tempId)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover Layout
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.rule_type === "LAYOUT_WITH_PHOTOS" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Layouts com fotos
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLayoutWithPhotos}
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Adicionar layout
                  </Button>
                </div>
                {layoutWithPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Crie layouts informando quantas fotos o cliente deve enviar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {layoutWithPhotos.map((layout) => (
                      <div
                        key={layout.tempId}
                        className="rounded-lg border border-dashed border-gray-200 p-4 space-y-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-[2fr,1fr,1fr]">
                          <Input
                            value={layout.name}
                            placeholder="Nome do layout"
                            onChange={(event) =>
                              handleLayoutWithPhotosChange(
                                layout.tempId,
                                "name",
                                event.target.value
                              )
                            }
                          />
                          <Input
                            value={String(layout.photo_slots)}
                            type="number"
                            min={1}
                            placeholder="Qtd. Fotos"
                            onChange={(event) =>
                              handleLayoutWithPhotosChange(
                                layout.tempId,
                                "photo_slots",
                                event.target.value
                              )
                            }
                          />
                          <Input
                            value={String(layout.price_adjustment ?? 0)}
                            type="number"
                            placeholder="Ajuste R$"
                            onChange={(event) =>
                              handleLayoutWithPhotosChange(
                                layout.tempId,
                                "price_adjustment",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <Input
                          value={layout.description ?? ""}
                          placeholder="Descrição (opcional)"
                          onChange={(event) =>
                            handleLayoutWithPhotosChange(
                              layout.tempId,
                              "description",
                              event.target.value
                            )
                          }
                        />

                        <div className="space-y-2">
                          <Label className="text-xs">Imagem do Layout</Label>
                          {layoutWithPhotosPreviews.has(layout.tempId) && (
                            <div className="relative inline-block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={layoutWithPhotosPreviews.get(
                                  layout.tempId
                                )}
                                alt="Preview"
                                className="h-24 w-24 rounded-md object-cover border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={() =>
                                  clearLayoutWithPhotosImage(layout.tempId)
                                }
                              >
                                ×
                              </Button>
                            </div>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleLayoutWithPhotosImageChange(
                                layout.tempId,
                                e
                              )
                            }
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-gray-500">
                            Ou cole a URL da imagem:
                          </p>
                          <Input
                            value={layout.preview_image_url}
                            placeholder="https://exemplo.com/imagem.jpg"
                            onChange={(event) =>
                              handleLayoutWithPhotosChange(
                                layout.tempId,
                                "preview_image_url",
                                event.target.value
                              )
                            }
                            disabled={layoutWithPhotosImages.has(layout.tempId)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-red-500 hover:text-red-600"
                          onClick={() => removeLayoutWithPhotos(layout.tempId)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover Layout
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.rule_type === "ITEM_SUBSTITUTION" && (
              <div className="grid gap-2">
                <Label htmlFor="rule-advanced">
                  Configuração avançada (JSON)
                </Label>
                <textarea
                  id="rule-advanced"
                  className={textAreaClass}
                  value={advancedOptions}
                  onChange={(event) => setAdvancedOptions(event.target.value)}
                  placeholder='Ex.: {"items": [{"original_item": "..."}]}'
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
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
