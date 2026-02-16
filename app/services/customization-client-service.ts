/**
 * Serviço de customização do lado do cliente
 * Gerencia estado local, validações e comunicação com a API de customização
 */

import {
  CustomizationConfigResponse,
  CustomizationInput,
  CustomizationType,
  ArtworkAsset,
  SaveOrderItemCustomizationPayload,
} from "../types/customization";

export interface CustomizationStateData {
  photos?: Array<{
    file: File;
    preview: string;
    slot?: number;
  }>;
  texts?: string[];
  selectedLayoutId?: string;
  selectedOptions?: Record<string, string>;
  [key: string]: unknown;
}

export interface CustomizationSessionState {
  itemId: string;
  config: CustomizationConfigResponse | null;
  customizations: Map<string, CustomizationStateData>;
  finalArtwork?: ArtworkAsset;
  finalArtworks?: ArtworkAsset[];
}

class CustomizationClientService {
  private sessionState: CustomizationSessionState | null = null;

  constructor() {
    this.sessionState = null;
  }

  /**
   * Inicializa uma nova sessão de customização
   */
  initializeSession(itemId: string, config: CustomizationConfigResponse): void {
    this.sessionState = {
      itemId,
      config,
      customizations: new Map(),
    };
  }

  /**
   * Obtém o estado atual da sessão
   */
  getSessionState(): CustomizationSessionState | null {
    return this.sessionState;
  }

  /**
   * Limpa a sessão de customização
   */
  clearSession(): void {

    if (this.sessionState) {
      this.sessionState.customizations.forEach((data) => {
        if (data.photos) {
          data.photos.forEach((photo) => {
            if (photo.preview.startsWith("blob:")) {
              URL.revokeObjectURL(photo.preview);
            }
          });
        }
      });
    }

    this.sessionState = null;
  }

  /**
   * Atualiza dados de customização para uma regra específica
   */
  updateCustomization(ruleId: string, data: CustomizationStateData): void {
    if (!this.sessionState) {
      throw new Error("Sessão de customização não inicializada");
    }

    this.sessionState.customizations.set(ruleId, data);
  }

  /**
   * Obtém dados de customização para uma regra específica
   */
  getCustomization(ruleId: string): CustomizationStateData | undefined {
    if (!this.sessionState) {
      return undefined;
    }

    return this.sessionState.customizations.get(ruleId);
  }

  /**
   * Remove customização de uma regra específica
   */
  removeCustomization(ruleId: string): void {
    if (!this.sessionState) {
      return;
    }

    const data = this.sessionState.customizations.get(ruleId);
    if (data?.photos) {

      data.photos.forEach((photo) => {
        if (photo.preview.startsWith("blob:")) {
          URL.revokeObjectURL(photo.preview);
        }
      });
    }

    this.sessionState.customizations.delete(ruleId);
  }

  /**
   * Converte uma imagem File para base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converte imagem para ArtworkAsset
   */
  async fileToArtworkAsset(file: File): Promise<ArtworkAsset> {
    const base64 = await this.fileToBase64(file);
    return {
      base64Data: base64,
      mimeType: file.type,
      fileName: file.name,
    };
  }

  /**
   * Define a arte final renderizada
   */
  setFinalArtwork(artwork: ArtworkAsset): void {
    if (!this.sessionState) {
      throw new Error("Sessão de customização não inicializada");
    }

    this.sessionState.finalArtwork = artwork;
  }

  /**
   * Define múltiplas artes finais renderizadas
   */
  setFinalArtworks(artworks: ArtworkAsset[]): void {
    if (!this.sessionState) {
      throw new Error("Sessão de customização não inicializada");
    }

    this.sessionState.finalArtworks = artworks;
  }

  /**
   * Converte dados da sessão para formato de input da API
   */
  buildCustomizationInputs(): CustomizationInput[] {
    if (!this.sessionState || !this.sessionState.config) {
      return [];
    }

    const inputs: CustomizationInput[] = [];

    if (this.sessionState.config.customizations) {
      this.sessionState.config.customizations.forEach((customization) => {
        const data = this.sessionState!.customizations.get(customization.id);
        if (!data) return;

        inputs.push({
          ruleId: customization.id,
          customizationType: customization.type as CustomizationType,
          data: data as Record<string, unknown>,
          selectedLayoutId: data.selectedLayoutId,
        });
      });
    }

    return inputs;
  }

  /**
   * Valida se todas as regras obrigatórias foram preenchidas
   */
  validateRequiredRules(): { valid: boolean; missingRules: string[] } {
    if (!this.sessionState || !this.sessionState.config) {
      return { valid: false, missingRules: [] };
    }

    const missingRules: string[] = [];

    if (this.sessionState.config.customizations) {
      this.sessionState.config.customizations.forEach((customization) => {
        if (customization.isRequired) {
          const data = this.sessionState!.customizations.get(customization.id);
          if (!data) {
            missingRules.push(customization.name);
          }
        }
      });
    }

    return {
      valid: missingRules.length === 0,
      missingRules,
    };
  }

  /**
   * Monta payload para salvar customização do pedido
   */
  async buildOrderItemCustomizationPayload(
    title: string
  ): Promise<SaveOrderItemCustomizationPayload> {
    if (!this.sessionState) {
      throw new Error("Sessão de customização não inicializada");
    }

    const inputs = this.buildCustomizationInputs();
    const primaryInput = inputs[0];

    if (!primaryInput) {
      throw new Error("Nenhuma customização definida");
    }

    const payload: SaveOrderItemCustomizationPayload = {
      customizationRuleId: primaryInput.customizationRuleId || null,
      customizationType: primaryInput.customizationType,
      title,
      selectedLayoutId: primaryInput.selectedLayoutId || null,
      data: {},
    };

    for (const input of inputs) {
      Object.assign(payload.data, input.data);
    }

    if (this.sessionState.finalArtwork) {
      payload.finalArtwork = this.sessionState.finalArtwork;
    }

    if (
      this.sessionState.finalArtworks &&
      this.sessionState.finalArtworks.length > 0
    ) {
      payload.finalArtworks = this.sessionState.finalArtworks;
    }

    return payload;
  }

  /**
   * Salva dados de customização no localStorage
   */
  saveToLocalStorage(key: string): void {
    if (!this.sessionState) {
      return;
    }

    const customizationsObj: Record<string, CustomizationStateData> = {};
    this.sessionState.customizations.forEach((value, key) => {

      const sanitizedData = { ...value };
      if (sanitizedData.photos) {
        sanitizedData.photos = sanitizedData.photos.map((photo) => ({
          preview: photo.preview,
          slot: photo.slot,

        })) as typeof sanitizedData.photos;
      }
      customizationsObj[key] = sanitizedData;
    });

    const state = {
      itemId: this.sessionState.itemId,
      customizations: customizationsObj,
      finalArtwork: this.sessionState.finalArtwork,
      finalArtworks: this.sessionState.finalArtworks,
    };

    localStorage.setItem(key, JSON.stringify(state));
  }

  /**
   * Carrega dados de customização do localStorage
   */
  loadFromLocalStorage(
    key: string,
    config: CustomizationConfigResponse
  ): boolean {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return false;

      const state = JSON.parse(stored);

      this.sessionState = {
        itemId: state.itemId,
        config,
        customizations: new Map(Object.entries(state.customizations || {})),
        finalArtwork: state.finalArtwork,
        finalArtworks: state.finalArtworks,
      };

      return true;
    } catch (error) {
      console.error("Erro ao carregar customização do localStorage:", error);
      return false;
    }
  }

  /**
   * Remove dados de customização do localStorage
   */
  removeFromLocalStorage(key: string): void {
    localStorage.removeItem(key);
  }
}

const customizationClientService = new CustomizationClientService();

export default customizationClientService;
