"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Layers3,
  Link2,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import type {
  Additional,
  Product,
  Type as ProductType,
} from "../../hooks/use-api";
import { cn } from "../../lib/utils";
import { ProductRuleManager } from "./product-rule-manager";
import { ItemConstraintManager } from "./item-constraint-manager";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

interface CustomizationManagerProps {
  productTypes: ProductType[];
  products: Product[];
  additionals: Additional[];
}

type ViewOption = "new" | "constraints" | "legacy";

const VIEW_OPTIONS: Array<{
  id: ViewOption;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "new", label: "Regras de Customização", icon: Sparkles },
  { id: "constraints", label: "Constraints de Itens", icon: Link2 },
  { id: "legacy", label: "Sistema Legado", icon: Layers3 },
];

export function CustomizationManager({
  productTypes,
}: CustomizationManagerProps) {
  const [activeView, setActiveView] = useState<ViewOption>("new");

  const hasProductTypes = productTypes.length > 0;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gerenciamento de Customizações
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure regras de customização para produtos e adicionais
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sistema:</span>
            <div className="flex gap-2">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.id}
                    variant={activeView === option.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView(option.id)}
                    className={cn(
                      "flex items-center gap-2",
                      activeView === option.id
                        ? "bg-purple-600 hover:bg-purple-700"
                        : ""
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {activeView === "new" && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">
                    Novo Sistema de Customizações
                  </p>
                  <p className="text-blue-700">
                    Configure regras de customização baseadas em tipos de
                    produtos. Suporta múltiplos tipos: upload de fotos, layouts
                    prontos, layouts com fotos, campos de texto, opções
                    seletivas e substituição de itens.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeView === "legacy" && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-medium mb-1">Sistema Legado</p>
                  <p className="text-orange-700">
                    Sistema antigo de customizações. Mantido para
                    retrocompatibilidade. Recomenda-se usar o novo sistema para
                    novos produtos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {activeView === "new" && (
        <>
          {!hasProductTypes ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum tipo de produto cadastrado
                </h3>
                <p className="text-gray-600 mb-4">
                  É necessário ter ao menos um tipo de produto para configurar
                  regras de customização.
                </p>
                <p className="text-sm text-gray-500">
                  Acesse a aba &quot;Tipos&quot; para criar um novo tipo de
                  produto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ProductRuleManager productTypes={productTypes} />
          )}
        </>
      )}

      {activeView === "constraints" && (
        <>
          <Card>
            <CardContent className="py-4">
              <div className="flex gap-3">
                <Link2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">
                    Gerenciamento de Constraints entre Itens
                  </p>
                  <p className="text-blue-700">
                    Configure regras de dependência ou exclusão entre produtos e
                    adicionais. Por exemplo: &quot;Cesta Romântica&quot; não
                    pode ser pedida junto com &quot;Cesta Moderna&quot;, ou
                    &quot;Quadro de Fotos&quot; requer &quot;Moldura
                    Premium&quot;.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <ItemConstraintManager />
        </>
      )}

      {activeView === "legacy" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sistema Legado
            </h3>
            <p className="text-gray-600 mb-4">
              O gerenciamento de customizações legadas ainda não foi
              implementado nesta interface.
            </p>
            <p className="text-sm text-gray-500">
              As customizações legadas existentes continuam funcionando
              normalmente.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
