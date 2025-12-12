export interface CustomizationData {
  customization_type?: string;
  title?: string;
  photos?: {
    preview_url?: string;
    google_drive_url?: string;
    original_name?: string;
    [key: string]: unknown;
  }[];
  selected_option?: string;
  selected_option_label?: string;
  text?: string;
  selected_item?: { selected_item?: string } | string;
  selected_item_label?: string;
  price_adjustment?: number;
  [key: string]: unknown;
}

export function parseCustomizationData(
  value?: string | null
): CustomizationData {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as CustomizationData;

    // Fix bugged TEXT format
    // Example: "text: Mensagem da Cartinha: Eu te amo, fields: [object Object], _priceAdjustment: 0"
    if (
      parsed.customization_type === "TEXT" &&
      parsed.text &&
      typeof parsed.text === "string"
    ) {
      if (parsed.text.startsWith("text:")) {
        // Try to extract the actual text between "text:" and ", fields:"
        // Or if simple "text: ...", just take the rest.
        // It seems the format is "text: <Content>, fields: ..."

        // This regex looks for "text: " at start, captures until ", fields:" or end of string
        const match = parsed.text.match(/^text:\s*(.*?)(?:,\s*fields:|$)/);
        if (match && match[1]) {
          // Sometimes it duplicates the title in the text like "Mensagem da Cartinha: Eu te amo"
          // If the extracted text starts with the title, we might want to trim it, but maybe not safe.
          // Let's just return the captured text for now.
          parsed.text = match[1].trim();
        }
      }
    }

    return parsed;
  } catch {
    // If top level is not JSON, maybe it's that weird string format directly?
    // Unlikely based on report, but safe to return empty or try to salvage.
    return {};
  }
}

export function getCustomizationTypeLabel(type?: string): string {
  switch (type) {
    case "IMAGES":
      return "Fotos";
    case "TEXT":
    case "TEXT_INPUT":
      return "Texto";
    case "MULTIPLE_CHOICE":
      return "Escolha";
    case "BASE_LAYOUT":
      return "Layout";
    default:
      return "Customização";
  }
}
