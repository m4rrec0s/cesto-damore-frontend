// Sistema de eventos para comunicação entre ItemCustomizationModal e CustomizationItem

export interface CustomizationValidationState {
  isValid: boolean;
  isEmpty: boolean;
  customizationId: string;
}

export interface CustomizationSaveEvent {
  customizationId: string;
}

class CustomizationEventBus {
  private validationListeners: Array<(state: CustomizationValidationState) => void> = [];
  private saveHandlers: Map<string, () => void> = new Map();

  onValidationChange(callback: (state: CustomizationValidationState) => void) {
    this.validationListeners.push(callback);
    return () => {
      const index = this.validationListeners.indexOf(callback);
      if (index > -1) this.validationListeners.splice(index, 1);
    };
  }

  emitValidation(state: CustomizationValidationState) {
    this.validationListeners.forEach(cb => cb(state));
  }

  registerSaveHandler(customizationId: string, handler: () => void) {
    this.saveHandlers.set(customizationId, handler);
  }

  unregisterSaveHandler(customizationId: string) {
    this.saveHandlers.delete(customizationId);
  }

  triggerSave(customizationId: string) {
    const handler = this.saveHandlers.get(customizationId);
    if (handler) handler();
  }
}

export const customizationEvents = new CustomizationEventBus();
