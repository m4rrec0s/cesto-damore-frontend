"use client";

import { useState } from "react";
import {
  Settings,
  Image as ImageIcon,
  List,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";

import {
  FeedConfiguration,
  CreateFeedConfigurationInput,
  UpdateFeedConfigurationInput,
} from "../../hooks/use-api";
import ConfigurationTab from "./feed/ConfigurationTab";
import BannersTab from "./feed/BannersTab";
import SectionsTab from "./feed/SectionsTab";

interface FeedManagerProps {
  configurations: FeedConfiguration[];
  onUpdate: () => void;
  api: {
    createFeedConfiguration: (
      data: CreateFeedConfigurationInput
    ) => Promise<FeedConfiguration>;
    updateFeedConfiguration: (
      id: string,
      data: UpdateFeedConfigurationInput
    ) => Promise<FeedConfiguration>;
    deleteFeedConfiguration: (id: string) => Promise<void>;
  };
}

export default function FeedManager({
  configurations,
  onUpdate,
  api,
}: FeedManagerProps) {
  const [activeTab, setActiveTab] = useState("configuration");
  const [selectedConfigId, setSelectedConfigId] = useState<string>(() => {
    const activeConfig = configurations.find((config) => config.is_active);
    return activeConfig?.id || configurations[0]?.id || "";
  });
  const [loading, setLoading] = useState(false);

  const handleCreateConfiguration = async () => {
    try {
      setLoading(true);
      await api.createFeedConfiguration({
        name: `Nova Configuração ${configurations.length + 1}`,
        is_active: false,
      });
      alert("Nova configuração criada com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao criar configuração:", error);
      alert("Erro ao criar nova configuração.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (configId: string, isActive: boolean) => {
    try {
      setLoading(true);
      await api.updateFeedConfiguration(configId, { is_active: isActive });
      alert("Configuração atualizada com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      alert("Erro ao atualizar configuração.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (configurations.length <= 1) {
      alert("Você precisa ter ao menos uma configuração no sistema.");
      return;
    }

    if (
      !confirm(
        "Tem certeza que deseja excluir esta configuração? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteFeedConfiguration(configId);
      alert("Configuração excluída com sucesso!");

      // Se a configuração excluída era a selecionada, seleciona outra
      if (selectedConfigId === configId) {
        const remainingConfigs = configurations.filter(
          (c) => c.id !== configId
        );
        setSelectedConfigId(remainingConfigs[0]?.id || "");
      }

      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir configuração:", error);
      alert("Erro ao excluir configuração.");
    } finally {
      setLoading(false);
    }
  };

  const selectedConfiguration = configurations.find(
    (config) => config.id === selectedConfigId
  );

  if (configurations.length === 0 && !loading) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhuma configuração encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            Crie uma nova configuração para começar a gerenciar o feed da loja.
          </p>
          <button
            onClick={handleCreateConfiguration}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira configuração
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label
              htmlFor="config-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Configuração Ativa
            </label>
            <select
              id="config-select"
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {configurations.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} {config.is_active ? "(Ativa)" : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedConfiguration && (
            <div className="flex items-center space-x-2 mt-6">
              <button
                onClick={() =>
                  handleToggleActive(
                    selectedConfiguration.id,
                    !selectedConfiguration.is_active
                  )
                }
                disabled={loading}
                className={`flex items-center px-3 py-1 text-sm rounded-md disabled:opacity-50 ${
                  selectedConfiguration.is_active
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {selectedConfiguration.is_active ? (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Ativa
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Inativa
                  </>
                )}
              </button>

              <button
                onClick={() =>
                  handleDeleteConfiguration(selectedConfiguration.id)
                }
                disabled={loading || configurations.length <= 1}
                className="flex items-center px-3 py-1 text-sm rounded-md bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  configurations.length <= 1
                    ? "Você precisa ter ao menos uma configuração"
                    : "Excluir configuração"
                }
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleCreateConfiguration}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Nova Configuração
            </>
          )}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("configuration")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "configuration"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Configurações Gerais
          </button>
          <button
            onClick={() => setActiveTab("banners")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "banners"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ImageIcon className="h-4 w-4 inline mr-2" />
            Banners
          </button>
          <button
            onClick={() => setActiveTab("sections")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "sections"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <List className="h-4 w-4 inline mr-2" />
            Seções
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {!selectedConfiguration ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Selecione uma configuração para continuar
            </p>
          </div>
        ) : (
          <>
            {activeTab === "configuration" && (
              <ConfigurationTab
                configuration={selectedConfiguration}
                onUpdate={onUpdate}
              />
            )}

            {activeTab === "banners" && (
              <BannersTab
                configurationId={selectedConfiguration.id}
                banners={selectedConfiguration.banners || []}
                onUpdate={onUpdate}
              />
            )}

            {activeTab === "sections" && (
              <SectionsTab
                configurationId={selectedConfiguration.id}
                sections={selectedConfiguration.sections || []}
                onUpdate={onUpdate}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
