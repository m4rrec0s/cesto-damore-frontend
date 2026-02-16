type CustomizationValue =
  | string
  | number
  | boolean
  | Record<string, string | number | boolean>
  | null;

interface PositionData {
  x: string;
  y: string;
  w: string;
  h: string;
  r: string;
  a: number;
}

interface CustomizationState {
  productId: string;
  customization: Record<string, CustomizationValue | PositionData>;
  ts: number;
  exp: number;
}

interface StorageQuota {
  used: number;
  limit: number;
  percentage: number;
}

interface SaveResult {
  success: boolean;
  key: string;
  size: number;
}

interface SaveErrorResult {
  success: false;
  error: string;
}

interface CleanupResult {
  deletedCount: number;
  freedBytes: number;
}

class CustomizationStorage {
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly PREFIX = "cesto-design";
  private readonly WARNING_THRESHOLD = 0.8;

  save(
    productId: string,
    customization: Record<string, CustomizationValue | PositionData>,
  ): SaveResult | SaveErrorResult {
    try {
      const now = Date.now();
      const state: CustomizationState = {
        productId,
        customization: this.compactifyCustomization(customization),
        ts: now,
        exp: now + this.DEFAULT_TTL_MS,
      };

      const key = `${this.PREFIX}:${productId}`;
      const jsonStr = JSON.stringify(state);

      const currentSize = this.getCurrentStorageSize();
      const newSize = new Blob([jsonStr]).size;

      if (
        currentSize + newSize >
        this.getStorageLimit() * this.WARNING_THRESHOLD
      ) {
        console.warn(
          "⚠️ LocalStorage próximo do limite. Limpando rascunhos antigos...",
        );
        this.cleanupOldDrafts();
      }

      localStorage.setItem(key, jsonStr);

      return {
        success: true,
        key,
        size: newSize,
      } as SaveResult;
    } catch (error) {
      console.error("❌ Erro ao salvar customização:", error);

      if (error instanceof DOMException && error.code === 22) {
        console.warn("⚠️ Quota excedida! Limpando rascunhos...");
        this.cleanupAllExpired();
        return {
          success: false,
          error: "Quota excedida após limpeza",
        } as SaveErrorResult;
      }

      throw error;
    }
  }

  load(productId: string): CustomizationState | null {
    try {
      const key = `${this.PREFIX}:${productId}`;
      const jsonStr = localStorage.getItem(key);

      if (!jsonStr) {
        return null;
      }

      const state = JSON.parse(jsonStr) as CustomizationState;

     
      if (state.exp && Date.now() > state.exp) {
        console.warn(`⚠️ Rascunho de ${productId} expirou`);
        localStorage.removeItem(key);
        return null;
      }

      return state;
    } catch (error) {
      console.error("❌ Erro ao carregar customização:", error);
      return null;
    }
  }

  delete(productId: string) {
    const key = `${this.PREFIX}:${productId}`;
    localStorage.removeItem(key);
  }

  listAllDrafts(): Array<{
    productId: string;
    timestamp: Date;
    expiresAt: Date;
  }> {
    const drafts = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith(`${this.PREFIX}:`)) {
        try {
          const jsonStr = localStorage.getItem(key);
          if (jsonStr) {
            const state = JSON.parse(jsonStr) as CustomizationState;
            drafts.push({
              productId: state.productId,
              timestamp: new Date(state.ts),
              expiresAt: new Date(state.exp),
            });
          }
        } catch (error) {
          console.error(`Erro ao parsear ${key}:`, error);
        }
      }
    }

    return drafts;
  }

  private compactifyCustomization(
    custom: Record<string, CustomizationValue | PositionData>,
  ): Record<string, CustomizationValue | PositionData> {
    const compacted: Record<string, CustomizationValue | PositionData> = {};

    for (const [key, value] of Object.entries(custom)) {
     
      if (typeof value === "string" && value.startsWith("data:")) {
        console.warn(`🗑️ Removido base64: ${key}`);
        continue;
      }

     
      if (key.includes("-position")) {
        const newKey = key.replace("-position", "-pos");
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const positionObj = value as Record<string, number | string>;
          compacted[newKey] = {
            x: String(positionObj.x ?? 0).substring(0, 6),
            y: String(positionObj.y ?? 0).substring(0, 6),
            w: String(positionObj.w ?? positionObj.width ?? 0).substring(0, 6),
            h: String(positionObj.h ?? positionObj.height ?? 0).substring(0, 6),
            r: String(positionObj.r ?? positionObj.ratio ?? 0).substring(0, 4),
            a: (positionObj.a ?? positionObj.angle ?? 0) as number,
          } as PositionData;
        }
        continue;
      }

     
      if (key.includes("-visibility")) {
        const newKey = key.replace("-visibility", "-vis");
        compacted[newKey] = value;
        continue;
      }

     
      compacted[key] = value;
    }

    return compacted;
  }


  expandCustomization(
    compacted: Record<string, CustomizationValue | PositionData>,
  ): Record<string, CustomizationValue | PositionData> {
    const expanded: Record<string, CustomizationValue | PositionData> = {};

    for (const [key, value] of Object.entries(compacted)) {
     
      if (key.includes("-pos")) {
        const newKey = key.replace("-pos", "-position");
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const positionObj = value as PositionData;
          expanded[newKey] = {
            x:
              typeof positionObj.x === "string"
                ? parseFloat(positionObj.x)
                : (positionObj.x as number),
            y:
              typeof positionObj.y === "string"
                ? parseFloat(positionObj.y)
                : (positionObj.y as number),
            width:
              typeof positionObj.w === "string"
                ? parseFloat(positionObj.w)
                : (positionObj.w as number),
            height:
              typeof positionObj.h === "string"
                ? parseFloat(positionObj.h)
                : (positionObj.h as number),
            ratio:
              typeof positionObj.r === "string"
                ? parseFloat(positionObj.r)
                : (positionObj.r as number),
            angle: positionObj.a,
          };
        }
        continue;
      }

     
      if (key.includes("-vis")) {
        const newKey = key.replace("-vis", "-visibility");
        expanded[newKey] = value;
        continue;
      }

      expanded[key] = value;
    }

    return expanded;
  }

  getStorageQuota(): StorageQuota {
    const used = this.getCurrentStorageSize();
    const limit = this.getStorageLimit();

    return {
      used,
      limit,
      percentage: (used / limit) * 100,
    };
  }

  private cleanupAllExpired() {
    const now = Date.now();
    let deletedCount = 0;
    let freedBytes = 0;

    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith(`${this.PREFIX}:`)) {
        try {
          const jsonStr = localStorage.getItem(key);
          if (jsonStr) {
            const state = JSON.parse(jsonStr) as CustomizationState;

            if (state.exp && now > state.exp) {
              keysToDelete.push(key);
              freedBytes += new Blob([jsonStr]).size;
              deletedCount++;
            }
          }
        } catch (error) {
          console.error(`Erro ao processar ${key}:`, error);
        }
      }
    }

   
    keysToDelete.forEach((key) => localStorage.removeItem(key));

    return { deletedCount, freedBytes } as CleanupResult;
  }

  private cleanupOldDrafts() {
    const drafts = this.listAllDrafts()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(5);

    drafts.forEach((draft) => this.delete(draft.productId));
  }

  clear() {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${this.PREFIX}:`)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => localStorage.removeItem(key));
  }

  private getCurrentStorageSize(): number {
    let total = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${this.PREFIX}:`)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += new Blob([value]).size;
        }
      }
    }

    return total;
  }

  private getStorageLimit(): number {
    return 5 * 1024 * 1024;
  }
}

export const customizationStorage = new CustomizationStorage();
