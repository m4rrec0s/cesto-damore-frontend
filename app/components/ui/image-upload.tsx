"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Upload, X, ImageIcon } from "lucide-react";
import { useApi } from "../../hooks/use-api";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  preview?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  className = "",
  preview = true,
}: ImageUploadProps) {
  const api = useApi();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("O arquivo deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const response = await api.uploadImage(file);
      onChange(response.url);
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert("Erro ao fazer upload da imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (value && preview) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
          <Image src={value} alt="Preview" fill className="object-cover" />
          <div className="absolute top-2 right-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{value}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            dragActive
              ? "border-orange-500 bg-orange-50"
              : "border-gray-300 hover:border-gray-400"
          }
          ${uploading ? "pointer-events-none opacity-50" : ""}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Selecionar arquivo de imagem"
        />

        <div className="space-y-2">
          {uploading ? (
            <>
              <Upload className="h-10 w-10 text-orange-500 animate-pulse mx-auto" />
              <p className="text-sm text-gray-600">Fazendo upload...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-gray-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  Clique para selecionar ou arraste uma imagem
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF até 5MB</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
