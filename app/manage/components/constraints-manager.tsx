"use client";

import { useState, useCallback, useEffect } from "react";
import { useApi } from "@/app/hooks/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plus, Trash2, AlertCircle, X, Link2 } from "lucide-react";
import { toast } from "sonner";

type ConstraintType = "MUTUALLY_EXCLUSIVE" | "REQUIRES";
type ItemType = "PRODUCT" | "ADDITIONAL";

interface ItemConstraint {
  id: string;
  target_item_id: string;
  target_item_type: ItemType;
  target_item_name?: string;
  constraint_type: ConstraintType;
  related_item_id: string;
  related_item_type: ItemType;
  related_item_name?: string;
  message?: string;
}

interface SearchableItem {
  id: string;
  name: string;
  type: ItemType;
}

interface ConstraintsManagerProps {
  filterItemId?: string;
  filterItemType?: ItemType;
}

export function ConstraintsManager({
  filterItemId,
  filterItemType,
}: ConstraintsManagerProps) {
  const api = useApi();
  const [constraints, setConstraints] = useState<ItemConstraint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchableItem[]>([]);

  const [formData, setFormData] = useState({
    target_item_id: "",
    target_item_type: "PRODUCT" as ItemType,
    target_item_name: "",
    constraint_type: "MUTUALLY_EXCLUSIVE" as ConstraintType,
    related_item_id: "",
    related_item_type: "PRODUCT" as ItemType,
    related_item_name: "",
    message: "",
  });

  const loadConstraints = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (filterItemId && filterItemType) {
        data = await api.get(
          `/admin/constraints/item/${filterItemType}/${filterItemId}`
        );
      } else {
        data = await api.get("/admin/constraints");
      }
      setConstraints(data);
    } catch (error) {
      console.error("Erro ao carregar constraints:", error);
      toast.error("Erro ao carregar constraints");
    } finally {
      setLoading(false);
    }
  }, [api, filterItemId, filterItemType]);

  useEffect(() => {
    loadConstraints();
  }, [loadConstraints]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        type SearchResponse = {
          items?: { id: string; name: string; type?: string }[];
          products?: { id: string; name: string }[];
          additionals?: { id: string; name: string }[];
        };

        const data = (await api.get(
          `/admin/constraints/search?q=${encodeURIComponent(query)}`
        )) as SearchResponse;

        // API may return { products, additionals } or a unified { items }
        let combined: SearchableItem[] = [];
        if (Array.isArray(data.items)) {
          combined = data.items.map((it) => ({
            id: it.id,
            name: it.name,
            type: (it.type as ItemType) || "ADDITIONAL",
          }));
        } else {
          combined = [
            ...(Array.isArray(data.products)
              ? data.products.map((p) => ({
                  id: p.id,
                  name: p.name,
                  type: "PRODUCT" as const,
                }))
              : []),
            ...(Array.isArray(data.additionals)
              ? data.additionals.map((a) => ({
                  id: a.id,
                  name: a.name,
                  type: "ADDITIONAL" as const,
                }))
              : []),
          ];
        }

        setSearchResults(combined);
      } catch (error) {
        console.error("Erro ao buscar itens:", error);
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

  const handleSelectTargetItem = (item: SearchableItem) => {
    setFormData({
      ...formData,
      target_item_id: item.id,
      target_item_type: item.type,
      target_item_name: item.name,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSelectRelatedItem = (item: SearchableItem) => {
    setFormData({
      ...formData,
      related_item_id: item.id,
      related_item_type: item.type,
      related_item_name: item.name,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.target_item_id) {
      toast.error("Selecione o item principal");
      return;
    }

    if (!formData.related_item_id) {
      toast.error("Selecione o item relacionado");
      return;
    }

    if (formData.target_item_id === formData.related_item_id) {
      toast.error("Os itens não podem ser iguais");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/constraints", {
        target_item_id: formData.target_item_id,
        target_item_type: formData.target_item_type,
        constraint_type: formData.constraint_type,
        related_item_id: formData.related_item_id,
        related_item_type: formData.related_item_type,
        message: formData.message.trim() || undefined,
      });

      toast.success("Constraint criado com sucesso");
      handleCloseModal();
      loadConstraints();
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
        toast.error("Este constraint já existe");
      } else {
        toast.error("Erro ao criar constraint");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (constraintId: string) => {
    if (!confirm("Tem certeza que deseja remover este constraint?")) return;

    setLoading(true);
    try {
      await api.delete(`/admin/constraints/${constraintId}`);
      toast.success("Constraint removido com sucesso");
      loadConstraints();
    } catch (error) {
      console.error("Erro ao deletar constraint:", error);
      toast.error("Erro ao deletar constraint");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      target_item_id: "",
      target_item_type: "PRODUCT",
      target_item_name: "",
      constraint_type: "MUTUALLY_EXCLUSIVE",
      related_item_id: "",
      related_item_type: "PRODUCT",
      related_item_name: "",
      message: "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSearchQuery("");
    setSearchResults([]);
    setFormData({
      target_item_id: "",
      target_item_type: "PRODUCT",
      target_item_name: "",
      constraint_type: "MUTUALLY_EXCLUSIVE",
      related_item_id: "",
      related_item_type: "PRODUCT",
      related_item_name: "",
      message: "",
    });
  };

  const getConstraintTypeLabel = (type: ConstraintType) => {
    return type === "MUTUALLY_EXCLUSIVE" ? "Mutuamente Exclusivo" : "Requer";
  };

  const getItemTypeLabel = (type: ItemType) => {
    return type === "PRODUCT" ? "Produto" : "Adicional";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Restrições de Itens</h2>
          <p className="text-sm text-gray-600">
            Gerencie quais itens podem ser combinados
          </p>
        </div>
        <Button onClick={handleOpenModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Restrição
        </Button>
      </div>

      {/* Lista de Constraints */}
      <div className="space-y-2">
        {constraints.length > 0 ? (
          constraints.map((constraint) => (
            <Card key={constraint.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getItemTypeLabel(constraint.target_item_type)}
                      </Badge>
                      <span className="font-medium text-sm">
                        {constraint.target_item_name ||
                          constraint.target_item_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Link2 className="h-4 w-4" />
                      <Badge
                        variant={
                          constraint.constraint_type === "MUTUALLY_EXCLUSIVE"
                            ? "destructive"
                            : "default"
                        }
                        className="text-xs"
                      >
                        {getConstraintTypeLabel(constraint.constraint_type)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getItemTypeLabel(constraint.related_item_type)}
                      </Badge>
                      <span className="font-medium text-sm">
                        {constraint.related_item_name ||
                          constraint.related_item_id}
                      </span>
                    </div>

                    {constraint.message && (
                      <p className="text-xs text-gray-600 italic">
                        {constraint.message}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(constraint.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma restrição configurada</p>
              <p className="text-xs mt-1">
                Crie restrições para controlar combinações de itens
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nova Restrição</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Item Principal */}
                <div>
                  <Label>Item Principal *</Label>
                  {formData.target_item_name ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mt-2">
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">
                          {getItemTypeLabel(formData.target_item_type)}
                        </Badge>
                        <p className="font-medium text-sm">
                          {formData.target_item_name}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            target_item_id: "",
                            target_item_name: "",
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative mt-2">
                      <Input
                        placeholder="Buscar produto ou adicional..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectTargetItem(item)}
                              className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Badge variant="outline" className="text-xs">
                                {getItemTypeLabel(item.type)}
                              </Badge>
                              <span className="text-sm">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tipo de Constraint */}
                <div>
                  <Label htmlFor="constraint_type">Tipo de Restrição *</Label>
                  <select
                    id="constraint_type"
                    title="Selecione o tipo de restrição"
                    value={formData.constraint_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        constraint_type: e.target.value as ConstraintType,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 mt-1"
                  >
                    <option value="MUTUALLY_EXCLUSIVE">
                      Mutuamente Exclusivo (não podem estar juntos)
                    </option>
                    <option value="REQUIRES">
                      Requer (um precisa do outro)
                    </option>
                  </select>
                </div>

                {/* Item Relacionado */}
                <div>
                  <Label>Item Relacionado *</Label>
                  {formData.related_item_name ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mt-2">
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">
                          {getItemTypeLabel(formData.related_item_type)}
                        </Badge>
                        <p className="font-medium text-sm">
                          {formData.related_item_name}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            related_item_id: "",
                            related_item_name: "",
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative mt-2">
                      <Input
                        placeholder="Buscar produto ou adicional..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectRelatedItem(item)}
                              className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Badge variant="outline" className="text-xs">
                                {getItemTypeLabel(item.type)}
                              </Badge>
                              <span className="text-sm">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mensagem */}
                <div>
                  <Label htmlFor="message">
                    Mensagem Customizada (Opcional)
                  </Label>
                  <Input
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Ex: Este item não pode ser combinado com..."
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Criando..." : "Criar Restrição"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
