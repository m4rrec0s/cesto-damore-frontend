"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Ban,
  CheckCircle,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useApi } from "../../hooks/use-api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import type {
  ItemConstraint,
  ConstraintType,
  SearchableItem,
} from "../../types/constraint";
import {
  CONSTRAINT_TYPE_LABELS,
  CONSTRAINT_TYPE_DESCRIPTIONS,
  ITEM_TYPE_LABELS,
} from "../../types/constraint";

interface ItemConstraintManagerProps {
  // Opcional: Se fornecido, mostra apenas constraints relacionados a este item
  filterItemId?: string;
  filterItemType?: "PRODUCT" | "ADDITIONAL";
}

export function ItemConstraintManager({
  filterItemId,
  filterItemType,
}: ItemConstraintManagerProps) {
  const api = useApi();
  const [constraints, setConstraints] = useState<ItemConstraint[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulário
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchableItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTargetItem, setSelectedTargetItem] =
    useState<SearchableItem | null>(null);
  const [selectedRelatedItem, setSelectedRelatedItem] =
    useState<SearchableItem | null>(null);
  const [constraintType, setConstraintType] =
    useState<ConstraintType>("MUTUALLY_EXCLUSIVE");
  const [message, setMessage] = useState("");

  // Carregar constraints
  const fetchConstraints = useCallback(async () => {
    setLoading(true);
    try {
      if (filterItemId && filterItemType) {
        const data = await api.getConstraintsByItem(
          filterItemType,
          filterItemId
        );
        setConstraints(data);
      } else {
        const data = await api.listAllConstraints();
        setConstraints(data);
      }
    } catch (error) {
      console.error("Erro ao carregar constraints:", error);
      toast.error("Não foi possível carregar os constraints");
    } finally {
      setLoading(false);
    }
  }, [api, filterItemId, filterItemType]);

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  // Buscar itens
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const data = await api.searchItemsForConstraints(query);
        const combined = [
          ...data.products.map((p) => ({
            ...p,
            type: "PRODUCT" as const,
          })),
          ...data.additionals.map((a) => ({
            ...a,
            type: "ADDITIONAL" as const,
          })),
        ];
        setSearchResults(combined);
      } catch (error) {
        console.error("Erro ao buscar itens:", error);
        toast.error("Erro ao buscar itens");
      } finally {
        setSearching(false);
      }
    },
    [api]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Criar constraint
  const handleCreate = async () => {
    if (!selectedTargetItem) {
      toast.error("Selecione o item principal");
      return;
    }

    if (!selectedRelatedItem) {
      toast.error("Selecione o item relacionado");
      return;
    }

    if (selectedTargetItem.id === selectedRelatedItem.id) {
      toast.error("Os itens não podem ser iguais");
      return;
    }

    setSaving(true);
    try {
      await api.createConstraint({
        target_item_id: selectedTargetItem.id,
        target_item_type: selectedTargetItem.type,
        constraint_type: constraintType,
        related_item_id: selectedRelatedItem.id,
        related_item_type: selectedRelatedItem.type,
        message: message.trim() || undefined,
      });

      toast.success("Constraint criado com sucesso");

      // Limpar formulário
      setSelectedTargetItem(null);
      setSelectedRelatedItem(null);
      setMessage("");
      setSearchQuery("");
      setSearchResults([]);

      // Recarregar lista
      fetchConstraints();
    } catch (error: unknown) {
      console.error("Erro ao criar constraint:", error);
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "status" in error.response &&
        error.response.status === 409
      ) {
        toast.error("Constraint já existe");
      } else {
        toast.error("Não foi possível criar o constraint");
      }
    } finally {
      setSaving(false);
    }
  };

  // Deletar constraint
  const handleDelete = async (constraint: ItemConstraint) => {
    const confirmed = window.confirm(
      `Remover constraint entre "${constraint.target_item_name}" e "${constraint.related_item_name}"?`
    );
    if (!confirmed) return;

    try {
      await api.deleteConstraint(constraint.id);
      toast.success("Constraint removido com sucesso");
      fetchConstraints();
    } catch (error) {
      console.error("Erro ao deletar constraint:", error);
      toast.error("Não foi possível remover o constraint");
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Criação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Novo Constraint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca de Itens */}
          <div className="grid gap-2">
            <Label htmlFor="search">Buscar Produto ou Adicional</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do item..."
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Resultados da Busca */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto rounded-md border bg-white shadow-lg">
                {searchResults.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => {
                      if (!selectedTargetItem) {
                        setSelectedTargetItem(item);
                      } else if (!selectedRelatedItem) {
                        setSelectedRelatedItem(item);
                      }
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="flex w-full items-center gap-3 border-b p-3 hover:bg-gray-50 last:border-b-0"
                  >
                    {item.image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {ITEM_TYPE_LABELS[item.type]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Selecionado - Principal */}
          <div className="grid gap-2">
            <Label>Item Principal</Label>
            {selectedTargetItem ? (
              <div className="flex items-center justify-between rounded-md border bg-purple-50 p-3">
                <div className="flex items-center gap-3">
                  {selectedTargetItem.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedTargetItem.image_url}
                      alt={selectedTargetItem.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium">{selectedTargetItem.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {ITEM_TYPE_LABELS[selectedTargetItem.type]}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTargetItem(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                Busque e selecione o item principal
              </div>
            )}
          </div>

          {/* Tipo de Constraint */}
          <div className="grid gap-2">
            <Label htmlFor="constraint-type">Tipo de Constraint</Label>
            <Select
              value={constraintType}
              onValueChange={(value) =>
                setConstraintType(value as ConstraintType)
              }
            >
              <SelectTrigger id="constraint-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(CONSTRAINT_TYPE_LABELS) as [
                    ConstraintType,
                    string
                  ][]
                ).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {CONSTRAINT_TYPE_DESCRIPTIONS[constraintType]}
            </p>
          </div>

          {/* Item Selecionado - Relacionado */}
          <div className="grid gap-2">
            <Label>Item Relacionado</Label>
            {selectedRelatedItem ? (
              <div className="flex items-center justify-between rounded-md border bg-blue-50 p-3">
                <div className="flex items-center gap-3">
                  {selectedRelatedItem.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedRelatedItem.image_url}
                      alt={selectedRelatedItem.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium">
                      {selectedRelatedItem.name}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {ITEM_TYPE_LABELS[selectedRelatedItem.type]}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRelatedItem(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                Busque e selecione o item relacionado
              </div>
            )}
          </div>

          {/* Mensagem Customizada */}
          <div className="grid gap-2">
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Não pode ter ambos no mesmo pedido"
            />
          </div>

          {/* Botão Criar */}
          <Button
            onClick={handleCreate}
            disabled={saving || !selectedTargetItem || !selectedRelatedItem}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar Constraint
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Constraints */}
      <Card>
        <CardHeader>
          <CardTitle>Constraints Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : constraints.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p>Nenhum constraint cadastrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {constraints.map((constraint) => (
                <div
                  key={constraint.id}
                  className="flex items-start justify-between rounded-lg border p-4 hover:bg-gray-50"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {constraint.constraint_type === "MUTUALLY_EXCLUSIVE" ? (
                        <Ban className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <Badge variant="outline">
                        {CONSTRAINT_TYPE_LABELS[constraint.constraint_type]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {constraint.target_item_name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {ITEM_TYPE_LABELS[constraint.target_item_type]}
                      </Badge>
                      <span className="text-gray-400">
                        {constraint.constraint_type === "MUTUALLY_EXCLUSIVE"
                          ? "⇔"
                          : "→"}
                      </span>
                      <span className="font-medium">
                        {constraint.related_item_name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {ITEM_TYPE_LABELS[constraint.related_item_type]}
                      </Badge>
                    </div>

                    {constraint.message && (
                      <p className="text-sm text-gray-600">
                        &quot;{constraint.message}&quot;
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(constraint)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
