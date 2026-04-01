import type { CartCustomization } from "@/app/hooks/use-cart";

export const renderCustomizationValue = (custom: CartCustomization) => {
  switch (custom.customization_type) {
    case "TEXT":
      return custom.text?.trim() || "Mensagem não informada";
    case "MULTIPLE_CHOICE":
      return (
        custom.label_selected ||
        custom.selected_option_label ||
        custom.selected_option ||
        "Opção não selecionada"
      );
    case "DYNAMIC_LAYOUT":
      if (custom.label_selected) return custom.label_selected;

      if (custom.selected_item_label) return custom.selected_item_label;
      if (custom.selected_option_label) return custom.selected_option_label;
      if (custom.text) return custom.text;
      if (typeof custom.selected_item === "string") {
        return custom.selected_item;
      }
      if (
        custom.selected_item &&
        typeof custom.selected_item === "object" &&
        "selected_item" in custom.selected_item
      ) {
        return (
          (custom.selected_item as { selected_item?: string }).selected_item ||
          "Design selecionado"
        );
      }
      return "Design selecionado";
    case "IMAGES":
      return `${custom.photos?.length || 0} foto(s)`;
    default:
      return "Personalização";
  }
};
