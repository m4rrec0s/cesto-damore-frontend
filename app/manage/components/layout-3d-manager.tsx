"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Plus, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PrintArea {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { width: number; height: number };
}

interface Layout {
  id: string;
  item_id: string;
  name: string;
  image_url: string;
  layout_data: {
    model_url: string;
    print_areas?: PrintArea[];
  };
}

interface Item {
  id: string;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function LayoutManager() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    item_id: "",
    name: "",
    model_url: "",
  });

  useEffect(() => {
    fetchItems();
    fetchLayouts();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    }
  };

  const fetchLayouts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/layouts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLayouts(data);
      }
    } catch (error) {
      console.error("Erro ao buscar layouts:", error);
      toast.error("Erro ao buscar layouts");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".glb") && !file.name.endsWith(".gltf")) {
      toast.error("Apenas arquivos .glb e .gltf são permitidos");
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("model", file);

      const response = await fetch(`${API_URL}/layouts/upload-3d`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, model_url: data.url }));
        toast.success("Modelo 3D enviado com sucesso!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao enviar modelo 3D");
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do modelo 3D");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.model_url) {
      toast.error("Faça upload de um modelo 3D primeiro");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        item_id: formData.item_id,
        name: formData.name,
        layout_data: {
          model_url: formData.model_url,
          print_areas: [],
          camera_position: { x: 0, y: 5, z: 10 },
          camera_target: { x: 0, y: 0, z: 0 },
        },
      };

      const response = await fetch(`${API_URL}/layouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Layout 3D criado com sucesso!");
        setIsDialogOpen(false);
        resetForm();
        fetchLayouts();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao criar layout");
      }
    } catch (error) {
      console.error("Erro ao criar layout:", error);
      toast.error("Erro ao criar layout");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este layout?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/layouts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Layout deletado com sucesso!");
        fetchLayouts();
      } else {
        toast.error("Erro ao deletar layout");
      }
    } catch (error) {
      console.error("Erro ao deletar layout:", error);
      toast.error("Erro ao deletar layout");
    }
  };

  const resetForm = () => {
    setFormData({
      item_id: "",
      name: "",
      model_url: "",
    });
  };

  const getItemName = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    return item?.name || "Item não encontrado";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gerenciar Layouts 3D</span>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Layout 3D
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Layout 3D</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, item_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do Layout</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Layout Caneca Clássica"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo 3D (.glb ou .gltf)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept=".glb,.gltf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      {uploading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                    {formData.model_url && (
                      <p className="text-sm text-green-600">
                        ✓ Modelo enviado: {formData.model_url}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploading}>
                      <Upload className="mr-2 h-4 w-4" />
                      Criar Layout
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Modelo 3D</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {layouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Nenhum layout encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  layouts.map((layout) => (
                    <TableRow key={layout.id}>
                      <TableCell className="font-medium">
                        {layout.name}
                      </TableCell>
                      <TableCell>{getItemName(layout.item_id)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {layout.layout_data.model_url.split("/").pop()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(layout.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
