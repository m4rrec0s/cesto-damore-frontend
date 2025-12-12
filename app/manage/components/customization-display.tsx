import { Badge } from "@/app/components/ui/badge";
import { ImageIcon, Type, MousePointerClick } from "lucide-react";
import {
  parseCustomizationData,
  getCustomizationTypeLabel,
} from "../utils/parse-customization";
import Image from "next/image";

interface CustomizationDisplayProps {
  // It receives the raw customization object from the order item
  customization: {
    id?: string;
    customization_type?: string;
    title?: string;
    value?: string | null;
    [key: string]:
      | string
      | string[]
      | undefined
      | null
      | { [key: string]: unknown };
  };
}

export function CustomizationDisplay({
  customization,
}: CustomizationDisplayProps) {
  const data = parseCustomizationData(customization.value);

  // Prefer values from the parsed data, fall back to top-level properties
  const type =
    customization.customization_type || data.customization_type || "UNKNOWN";
  const title = customization.title || data.title || "Personalização";

  const renderContent = () => {
    switch (type) {
      case "IMAGES":
        return (
          <div className="space-y-3">
            {data.photos &&
            Array.isArray(data.photos) &&
            data.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {data.photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                  >
                    <div className="aspect-square relative">
                      {/* Use preview_url first, then google_drive_url if it seems to be an image link (unlikely but possible fallback) */}
                      {photo.preview_url ? (
                        <Image
                          src={photo.preview_url}
                          alt={photo.original_name || `Foto ${idx + 1}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    {photo.google_drive_url && (
                      <a
                        href={photo.google_drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-x-0 bottom-0 block bg-black/60 py-1 text-center text-[10px] text-white backdrop-blur-sm hover:bg-black/80"
                      >
                        Ver no Drive
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Nenhuma imagem anexada.
              </p>
            )}
          </div>
        );

      case "MULTIPLE_CHOICE":
        return (
          <div className="flex flex-col gap-1">
            {data.selected_option_label || data.selected_option ? (
              <div className="flex items-center gap-2 rounded-md bg-white border border-gray-100 p-2 shadow-sm">
                <MousePointerClick className="h-4 w-4 text-rose-500" />
                <span className="font-medium text-gray-800">
                  {data.selected_option_label || data.selected_option}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Nenhuma opção selecionada.
              </p>
            )}
          </div>
        );

      case "BASE_LAYOUT":
        return (
          <div className="space-y-2">
            {data.text &&
            (data.text.startsWith("http") || data.text.startsWith("/")) ? (
              <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                <Image
                  src={data.text}
                  alt="Layout Preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : null}

            {data.selected_item_label ||
            (typeof data.selected_item === "string"
              ? data.selected_item
              : data.selected_item?.selected_item) ? (
              <p className="text-sm text-gray-600">
                <strong>Layout:</strong>{" "}
                {data.selected_item_label ||
                  (typeof data.selected_item === "string"
                    ? data.selected_item
                    : data.selected_item?.selected_item)}
              </p>
            ) : null}
          </div>
        );

      case "TEXT":
      case "TEXT_INPUT":
        return (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
            <div className="flex gap-2">
              <Type className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-medium">
                {data.text || "Sem texto"}
              </p>
            </div>
          </div>
        );

      default:
        // Generic JSON dumper for unknown types, but cleaner
        return (
          <div className="overflow-hidden rounded-md bg-gray-50 p-2 text-xs text-gray-500 font-mono border border-gray-200">
            {JSON.stringify(data, null, 2)}
          </div>
        );
    }
  };

  const typeLabel = getCustomizationTypeLabel(type);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-200 bg-white p-4 transition-all hover:border-gray-300">
      <div className="flex items-center gap-2 mb-1">
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-gray-50 border-gray-200"
        >
          {typeLabel}
        </Badge>
        <h5 className="text-sm font-semibold text-gray-800">{title}</h5>
      </div>

      <div className="pl-1">{renderContent()}</div>

      {/* Global Google Drive Link if exists at top level (some old formats might put it here) */}
      {/* Or if we want a fallback 'See Files' button if specific photos handling failed */}
    </div>
  );
}
