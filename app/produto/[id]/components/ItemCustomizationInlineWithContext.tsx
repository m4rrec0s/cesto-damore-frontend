"use client";

import { ItemCustomizationModal } from "./itemCustomizationsModal";

interface Props {
  componentId: string;
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  customizations: any[];
  onComplete: (hasCustomizations: boolean, data: any[]) => void;
  onImagesUpdate?: (itemId: string, imageCount: number, maxImages: number) => void;
}

export function ItemCustomizationInlineWithContext({
  componentId,
  ...props
}: Props) {
  return <ItemCustomizationModal {...props} renderMode="inline" />;
}
