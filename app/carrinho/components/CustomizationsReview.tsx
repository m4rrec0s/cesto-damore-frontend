"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { AlertCircle, CheckCircle2, Palette } from "lucide-react";
import type { CartCustomization } from "@/app/hooks/use-cart";

interface CustomizationsReviewProps {
  cartItems: Array<{
    product_id: string;
    product: {
      name: string;
      image_url?: string | null;
    };
    customizations?: CartCustomization[];
  }>;
}

export function CustomizationsReview({ cartItems }: CustomizationsReviewProps) {
  // Verificar se há itens com customizações
  const itemsWithCustomizations = cartItems.filter(
    (item) => item.customizations && item.customizations.length > 0
  );

  // Verificar customizações obrigatórias faltantes
  const missingRequired = itemsWithCustomizations.flatMap((item) =>
    (item.customizations || [])
      .filter((c) => c.is_required)
      .filter((c) => {
        // Validar se está preenchido
        if (c.customization_type === "TEXT") {
          return !c.text || c.text.trim().length === 0;
        }
        if (c.customization_type === "MULTIPLE_CHOICE") {
          return !c.selected_option;
        }
        if (c.customization_type === "IMAGES") {
          return !c.photos || c.photos.length === 0;
        }
        return false;
      })
      .map((c) => ({ product: item.product.name, customization: c.title }))
  );

  if (itemsWithCustomizations.length === 0) {
    return null; // Não mostrar nada se não houver customizações
  }

  const hasErrors = missingRequired.length > 0;

  return (
    <Card
      className={
        hasErrors ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-rose-600" />
          Revisão de Personalizações
          {hasErrors ? (
            <Badge variant="destructive" className="ml-auto">
              <AlertCircle className="h-3 w-3 mr-1" />
              {missingRequired.length} pendente(s)
            </Badge>
          ) : (
            <Badge className="ml-auto bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasErrors && (
          <div className="bg-white border-l-4 border-red-500 p-4 rounded-r-lg">
            <h4 className="font-semibold text-red-800 mb-2">
              ⚠️ Personalizações Obrigatórias Pendentes
            </h4>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              {missingRequired.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.product}:</strong> {item.customization}
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-3">
              Volte à página do produto e preencha as personalizações
              obrigatórias antes de continuar.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {itemsWithCustomizations.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-lg border border-gray-200"
            >
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                {item.product.name}
                <Badge variant="outline" className="text-xs">
                  {item.customizations?.length || 0} personalização(ões)
                </Badge>
              </h5>
              <div className="space-y-2">
                {item.customizations?.map((custom, cidx) => {
                  const isFilled = (() => {
                    if (custom.customization_type === "TEXT") {
                      return custom.text && custom.text.trim().length > 0;
                    }
                    if (custom.customization_type === "MULTIPLE_CHOICE") {
                      return Boolean(custom.selected_option);
                    }
                    if (custom.customization_type === "IMAGES") {
                      return custom.photos && custom.photos.length > 0;
                    }
                    return true;
                  })();

                  return (
                    <div
                      key={cidx}
                      className={`flex items-start justify-between p-3 rounded border ${
                        custom.is_required && !isFilled
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {custom.title}
                          </span>
                          {custom.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {custom.customization_type === "TEXT" &&
                            custom.text && (
                              <span className="italic">
                                &quot;{custom.text}&quot;
                              </span>
                            )}
                          {custom.customization_type === "MULTIPLE_CHOICE" &&
                            custom.selected_option && (
                              <span>
                                Opção:{" "}
                                {custom.label_selected ||
                                  custom.selected_option_label ||
                                  custom.selected_option}
                              </span>
                            )}
                          {custom.customization_type === "IMAGES" &&
                            custom.photos && (
                              <span>
                                {custom.photos.length} foto(s) enviada(s)
                              </span>
                            )}
                          {!isFilled && custom.is_required && (
                            <span className="text-red-600 font-semibold">
                              ⚠️ Não preenchido
                            </span>
                          )}
                        </div>
                      </div>
                      {isFilled ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : custom.is_required ? (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!hasErrors && (
          <div className="bg-white border-l-4 border-green-500 p-4 rounded-r-lg">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                <strong>Tudo certo!</strong> Todas as personalizações
                obrigatórias foram preenchidas.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
