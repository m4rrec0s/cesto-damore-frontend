"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import {
  FeedConfiguration,
  UpdateFeedConfigurationInput,
} from "@/app/hooks/use-api";
import useApi from "@/app/hooks/use-api";
import { toast } from "sonner";

interface ConfigurationTabProps {
  configuration: FeedConfiguration;
  onUpdate: () => void;
}

export default function ConfigurationTab({
  configuration,
  onUpdate,
}: ConfigurationTabProps) {
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateFeedConfigurationInput>({
    name: configuration.name,
    is_active: configuration.is_active,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.updateFeedConfiguration(configuration.id, formData);
      toast.success("Configuração atualizada com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informações Básicas
          </h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nome da Configuração
              </label>
              <input
                id="name"
                type="text"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Feed da Página Inicial"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active || false}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium text-gray-700"
              >
                Configuração ativa
              </label>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            <strong>Dica:</strong> Use as abas <strong>Banners</strong> e{" "}
            <strong>Seções</strong> para configurar o conteúdo que será exibido
            no feed. Você pode controlar a visibilidade e ordem de cada elemento
            individualmente.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center px-6 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configuração
            </>
          )}
        </button>
      </div>
    </form>
  );
}
