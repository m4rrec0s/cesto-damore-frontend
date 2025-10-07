"use client";

import React, { useState } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Type,
  CheckCircle2,
} from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import type { ProductRule } from "../../../types/customization";

interface CustomizationPanelProps {
  rules: ProductRule[];
  onUpdate: (ruleId: string, data: unknown) => void;
  data: Record<string, unknown>;
}

export function CustomizationPanel({
  rules,
  onUpdate,
  data,
}: CustomizationPanelProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File[]>>(
    {}
  );

  const handleFileUpload = (ruleId: string, files: FileList | null) => {
    if (!files) return;

    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const maxItems = rule.max_items || Infinity;
    const currentFiles = uploadingFiles[ruleId] || [];
    const newFiles = Array.from(files);

    // Limitar número de arquivos
    const totalFiles = [...currentFiles, ...newFiles].slice(0, maxItems);

    setUploadingFiles((prev) => ({
      ...prev,
      [ruleId]: totalFiles,
    }));

    // Converter para URLs de preview
    const urls = totalFiles.map((file) => URL.createObjectURL(file));

    onUpdate(ruleId, {
      files: totalFiles,
      previews: urls,
    });
  };

  const handleRemoveFile = (ruleId: string, index: number) => {
    const currentFiles = uploadingFiles[ruleId] || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);

    setUploadingFiles((prev) => ({
      ...prev,
      [ruleId]: newFiles,
    }));

    const urls = newFiles.map((file) => URL.createObjectURL(file));

    onUpdate(ruleId, {
      files: newFiles,
      previews: urls,
    });
  };

  const handleTextChange = (ruleId: string, text: string) => {
    onUpdate(ruleId, { text });
  };

  const handleOptionSelect = (ruleId: string, value: string) => {
    onUpdate(ruleId, { selectedOption: value });
  };

  const renderPhotoUpload = (rule: ProductRule) => {
    const currentFiles = uploadingFiles[rule.id] || [];
    const maxItems = rule.max_items || 10;
    const canAddMore = currentFiles.length < maxItems;

    return (
      <div className="space-y-3">
        {/* Área de Upload */}
        {canAddMore && (
          <label
            htmlFor={`upload-${rule.id}`}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Clique para enviar</span> ou
                arraste
              </p>
              <p className="text-xs text-gray-500">
                {currentFiles.length} de {maxItems}{" "}
                {maxItems === 1 ? "foto" : "fotos"}
              </p>
            </div>
            <input
              id={`upload-${rule.id}`}
              type="file"
              className="hidden"
              multiple={maxItems > 1}
              accept="image/*"
              onChange={(e) => handleFileUpload(rule.id, e.target.files)}
            />
          </label>
        )}

        {/* Preview das Fotos */}
        {currentFiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {currentFiles.map((file, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded-lg overflow-hidden border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveFile(rule.id, index)}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover foto"
                  aria-label="Remover foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTextInput = (rule: ProductRule) => {
    const currentData = data[rule.id] as { text?: string } | undefined;
    const text = currentData?.text || "";

    return (
      <div className="space-y-2">
        <Input
          type="text"
          placeholder={rule.description || "Digite aqui..."}
          value={text}
          onChange={(e) => handleTextChange(rule.id, e.target.value)}
          maxLength={rule.max_items || undefined}
          className="w-full"
        />
        {rule.max_items && (
          <p className="text-xs text-gray-500 text-right">
            {text.length} / {rule.max_items} caracteres
          </p>
        )}
      </div>
    );
  };

  const renderMultipleChoice = (rule: ProductRule) => {
    const currentData = data[rule.id] as
      | { selectedOption?: string }
      | undefined;
    const selected = currentData?.selectedOption;

    if (!rule.available_options || !Array.isArray(rule.available_options)) {
      return <p className="text-sm text-gray-500">Nenhuma opção disponível</p>;
    }

    type OptionItem = {
      label: string;
      value: string;
      price_adjustment?: number;
    };

    return (
      <div className="space-y-2">
        {rule.available_options.map((opt: unknown, index: number) => {
          const option = opt as OptionItem;
          const isSelected = selected === option.value;
          return (
            <button
              key={index}
              onClick={() => handleOptionSelect(rule.id, option.value)}
              className={`w-full flex items-center justify-between p-3 border rounded-lg transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium">{option.label}</span>
              </div>
              {option.price_adjustment && option.price_adjustment !== 0 && (
                <Badge variant="secondary" className="text-xs">
                  {option.price_adjustment > 0 ? "+" : ""}R${" "}
                  {option.price_adjustment.toFixed(2)}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma customização disponível para este produto</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rules
        .sort((a, b) => a.display_order - b.display_order)
        .map((rule) => (
          <div
            key={rule.id}
            className="bg-white border rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {rule.rule_type === "PHOTO_UPLOAD" && (
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                  )}
                  {rule.rule_type === "TEXT_INPUT" && (
                    <Type className="w-4 h-4 text-purple-500" />
                  )}
                  <h3 className="font-semibold text-sm">{rule.title}</h3>
                  {rule.required && (
                    <Badge variant="destructive" className="text-xs">
                      Obrigatório
                    </Badge>
                  )}
                </div>
                {rule.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rule.description}
                  </p>
                )}
              </div>
            </div>

            {/* Conteúdo baseado no tipo */}
            <div className="mt-3">
              {rule.rule_type === "PHOTO_UPLOAD" && renderPhotoUpload(rule)}
              {rule.rule_type === "TEXT_INPUT" && renderTextInput(rule)}
              {rule.rule_type === "OPTION_SELECT" && renderMultipleChoice(rule)}
              {rule.rule_type === "ITEM_SUBSTITUTION" && (
                <p className="text-sm text-gray-500">
                  Tipo de customização não suportado ainda
                </p>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
