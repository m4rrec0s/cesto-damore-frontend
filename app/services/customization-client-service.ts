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
  itemType: "PRODUCT" | "ADDITIONAL";
  itemId: string;
  config: CustomizationConfigResponse | null;
  customizations: Map<string, CustomizationStateData>;
  finalArtwork?: ArtworkAsset;
  finalArtworks?: ArtworkAsset[];
}

class CustomizationClientService {
  private sessionState: CustomizationSessionState | null = null;

  /**
   * Inicializa uma nova sessão de customização
   */
  initializeSession(
    itemType: "PRODUCT" | "ADDITIONAL",
    itemId: string,
    config: CustomizationConfigResponse
  ): void {
    this.sessionState = {
      itemType,
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
    // Limpar URLs de preview (revokeObjectURL)
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
      // Limpar URLs de preview
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

    // Processar rules novas
    this.sessionState.config.rules.forEach((rule) => {
      const data = this.sessionState!.customizations.get(rule.id);
      if (!data) return;

      let customizationType: CustomizationType;

      // Mapear ruleType para CustomizationType
      switch (rule.ruleType) {
        case "PHOTO_UPLOAD":
        case "LAYOUT_WITH_PHOTOS":
          customizationType = CustomizationType.PHOTO_UPLOAD;
          break;
        case "TEXT_INPUT":
          customizationType = CustomizationType.TEXT_INPUT;
          break;
        case "OPTION_SELECT":
        case "LAYOUT_PRESET":
          customizationType = CustomizationType.MULTIPLE_CHOICE;
          break;
        case "ITEM_SUBSTITUTION":
          customizationType = CustomizationType.ITEM_SUBSTITUTION;
          break;
        default:
          customizationType = CustomizationType.MULTIPLE_CHOICE;
      }

      inputs.push({
        ruleId: rule.id,
        customizationType,
        data: data as Record<string, unknown>,
        selectedLayoutId: data.selectedLayoutId,
      });
    });

    // Processar legacy rules
    this.sessionState.config.legacyRules.forEach((rule) => {
      const data = this.sessionState!.customizations.get(rule.id);
      if (!data) return;

      inputs.push({
        customizationRuleId: rule.id,
        customizationType: rule.customizationType,
        data: data as Record<string, unknown>,
        selectedLayoutId: rule.layoutId,
      });
    });

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

    // Validar rules novas
    this.sessionState.config.rules.forEach((rule) => {
      if (rule.required) {
        const data = this.sessionState!.customizations.get(rule.id);
        if (!data) {
          missingRules.push(rule.title);
        }
      }
    });

    // Validar legacy rules
    this.sessionState.config.legacyRules.forEach((rule) => {
      if (rule.isRequired) {
        const data = this.sessionState!.customizations.get(rule.id);
        if (!data) {
          missingRules.push(rule.title);
        }
      }
    });

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

    // Consolidar dados de todas as customizações
    for (const input of inputs) {
      Object.assign(payload.data, input.data);
    }

    // Adicionar arte final se existir
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

    // Converter Map para objeto simples para serialização
    const customizationsObj: Record<string, CustomizationStateData> = {};
    this.sessionState.customizations.forEach((value, key) => {
      // Não salvar arquivos File, apenas metadados
      const sanitizedData = { ...value };
      if (sanitizedData.photos) {
        sanitizedData.photos = sanitizedData.photos.map((photo) => ({
          preview: photo.preview,
          slot: photo.slot,
          // File não pode ser serializado, será recriado do preview
        })) as typeof sanitizedData.photos;
      }
      customizationsObj[key] = sanitizedData;
    });

    const state = {
      itemType: this.sessionState.itemType,
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
        itemType: state.itemType,
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

// Singleton
const customizationClientService = new CustomizationClientService();

export default customizationClientService;
