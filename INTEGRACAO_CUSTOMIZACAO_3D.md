# 🎨 Guia de Integração - Sistema de Customização 3D

Este documento descreve como integrar o novo sistema de customização com preview 3D na página do produto.

---

## 📁 Arquivos Criados

### 1. **Model3DViewer.tsx**

Componente para renderização 3D usando Three.js

- Localização: `app/produto/[id]/components/Model3DViewer.tsx`
- Funcionalidades:
  - Carrega modelos `.glb` ou `.gltf`
  - Aplica texturas de imagem customizadas
  - Renderiza texto em tempo real
  - Controles de rotação e zoom

### 2. **CustomizationPanel.tsx**

Painel de customização interativo

- Localização: `app/produto/[id]/components/CustomizationPanel.tsx`
- Funcionalidades:
  - Upload de fotos com preview
  - Input de texto com contador de caracteres
  - Seleção de opções múltiplas
  - Validação de campos obrigatórios

### 3. **ProductRuleManager.tsx**

Gerenciador admin de regras por tipo de produto

- Localização: `app/manage/components/product-rule-manager.tsx`
- Funcionalidades:
  - CRUD de ProductRules
  - Configuração de regras por ProductType
  - Gerenciamento centralizado

### 4. **Atualizações no useApi**

Novos métodos adicionados:

```typescript
// Métodos genéricos
api.get(url);
api.post(url, data);
api.put(url, data);
api.delete(url);

// Métodos de ProductRule
api.getProductRulesByType(productTypeId);
api.createProductRule(data);
api.updateProductRule(ruleId, data);
api.deleteProductRule(ruleId);
```

### 5. **use-customization-context.tsx**

Contexto React corrigido para usar novo endpoint unificado

---

## 🔧 Como Integrar na Página do Produto

### Opção 1: Integração Completa (Recomendado)

Substituir o sistema antigo pelo novo. Editar `client-product-page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  CustomizationProvider,
  useCustomizationContext,
} from "@/app/hooks/use-customization-context";
import { Model3DViewer } from "./Model3DViewer";
import { CustomizationPanel } from "./CustomizationPanel";
import { Button } from "@/app/components/ui/button";

function ProductContent({ productId }: { productId: string }) {
  const {
    state,
    loading,
    error,
    loadRules,
    updateCustomization,
    generatePreview,
    validate,
  } = useCustomizationContext();

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadRules(productId);
  }, [productId, loadRules]);

  const handleAddToCart = async () => {
    // Validar customizações
    const validation = await validate();

    if (!validation.valid) {
      toast.error("Complete as personalizações obrigatórias");
      validation.errors.forEach((err) => toast.error(err));
      return;
    }

    // Adicionar ao carrinho com customizações
    addToCart({
      productId,
      quantity,
      customizations: state?.data,
    });
  };

  // Gerar preview quando customizações mudarem
  useEffect(() => {
    if (state && Object.keys(state.data).length > 0) {
      generatePreview();
    }
  }, [state?.data, generatePreview]);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Coluna Esquerda: Preview 3D */}
      <div>
        {state?.model3dUrl ? (
          <Model3DViewer
            modelUrl={state.model3dUrl}
            textures={[
              // Converter customizações para texturas
              ...Object.entries(state.data).map(([ruleId, data]) => {
                const rule = state.rules.find((r) => r.id === ruleId);
                return {
                  areaId: ruleId,
                  imageUrl: data.previews?.[0],
                  text: data.text,
                  position: { x: 1.2, y: 0.5, z: 0 },
                  dimensions: { width: 2.4, height: 1.2 },
                };
              }),
            ]}
            className="w-full h-[600px]"
          />
        ) : (
          <img src={product.image_url} alt={product.name} />
        )}
      </div>

      {/* Coluna Direita: Informações e Customização */}
      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="text-2xl font-bold">R$ {product.price}</p>

        {/* Painel de Customização */}
        {state && state.rules.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">
              Personalize seu produto
            </h2>
            <CustomizationPanel
              rules={state.rules}
              onUpdate={updateCustomization}
              data={state.data}
            />
          </div>
        )}

        {/* Quantidade e Adicionar ao Carrinho */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <label>Quantidade:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <Button onClick={handleAddToCart} className="w-full">
            Adicionar ao Carrinho
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ClientProductPage({ id }: { id: string }) {
  return (
    <CustomizationProvider>
      <ProductContent productId={id} />
    </CustomizationProvider>
  );
}
```

### Opção 2: Integração Gradual (Coexistência)

Manter sistema antigo e adicionar novo apenas para produtos com `has_3d_preview = true`:

```typescript
// No client-product-page.tsx, adicionar verificação:

const [productType, setProductType] = useState(null);

useEffect(() => {
  // Buscar ProductType
  const fetchType = async () => {
    const type = await api.getType(product.type_id);
    setProductType(type);
  };
  if (product.type_id) fetchType();
}, [product.type_id]);

// Renderizar condicionalmente
{
  productType?.has_3d_preview ? (
    <NewCustomizationSystem productId={id} />
  ) : (
    <OldCustomizationSystem productId={id} />
  );
}
```

---

## 🎨 Configuração de Modelos 3D

### 1. Adicionar Modelos

Coloque arquivos `.glb` em `/public/models/`:

```
public/
  models/
    caneca-base.glb
    quadro-base.glb
```

### 2. Configurar no Backend

Atualize ProductType para incluir URL do modelo:

```sql
UPDATE "ProductType"
SET
  has_3d_preview = true,
  -- Armazenar URL em um campo JSON customizado
WHERE name = 'Caneca Personalizada';
```

Ou adicione campo `model_3d_url` ao schema se preferir.

### 3. Definir Áreas Customizáveis

As áreas customizáveis devem ser configuradas no `ProductRule`:

```json
{
  "rule_type": "PHOTO_UPLOAD",
  "title": "Foto Principal",
  "preview_image_url": null,
  "metadata": {
    "3d_area": {
      "position": { "x": 1.2, "y": 0.5, "z": 0.1 },
      "dimensions": { "width": 2.4, "height": 1.2 }
    }
  }
}
```

---

## 🧪 Testando o Sistema

### 1. Testar Upload de Fotos

```bash
# Acessar produto
http://localhost:3000/produto/[id]

# Verificar:
- Upload de múltiplas fotos
- Preview das fotos
- Remoção de fotos
- Aplicação em tempo real no modelo 3D
```

### 2. Testar Texto Personalizado

```bash
# Adicionar regra de texto no admin
# Digitar texto no produto
# Verificar renderização no modelo 3D
```

### 3. Testar Validações

```bash
# Marcar regra como obrigatória
# Tentar adicionar ao carrinho sem preencher
# Deve exibir erro
```

---

## 📋 Checklist de Implementação

- [x] Model3DViewer criado
- [x] CustomizationPanel criado
- [x] ProductRuleManager criado
- [x] use-customization-context corrigido
- [x] Métodos API adicionados
- [x] Dependências Three.js instaladas
- [ ] Integrar na página do produto
- [ ] Adicionar validação no carrinho
- [ ] Testar fluxo completo
- [ ] Adicionar modelos 3D em /public/models/
- [ ] Configurar ProductTypes com has_3d_preview
- [ ] Criar ProductRules para produtos 3D
- [ ] Documentar para equipe

---

## 🚨 Problemas Conhecidos

### Erro: "Cannot read properties of undefined"

**Solução**: Verificar se `state.rules` existe antes de mapear

### Modelo 3D não carrega

**Solução**: Verificar se o arquivo `.glb` está em `/public/models/` e o caminho está correto

### Preview não atualiza

**Solução**: Verificar se `generatePreview()` está sendo chamado após mudanças em `state.data`

---

## 📚 Próximos Passos

1. **Integrar validação no carrinho**

   - Adicionar check antes de finalizar compra
   - Validar se customizações obrigatórias estão preenchidas

2. **Melhorar preview 3D**

   - Adicionar múltiplos ângulos de câmera
   - Implementar screenshot do preview
   - Adicionar animações de transição

3. **Otimizar performance**

   - Lazy load de modelos 3D
   - Comprimir texturas
   - Cache de previews gerados

4. **Expandir funcionalidades**
   - Suporte a cores personalizadas
   - Filtros e efeitos nas fotos
   - Comparação antes/depois

---

## 💡 Exemplos de Uso

### Criar Regra para Caneca

```typescript
await api.createProductRule({
  product_type_id: "tipo-caneca-id",
  rule_type: "PHOTO_UPLOAD",
  title: "Fotos da Caneca",
  description: "Envie até 4 fotos para personalizar sua caneca",
  required: true,
  max_items: 4,
  conflict_with: null,
  dependencies: null,
  display_order: 0,
});
```

### Buscar Regras de um Produto

```typescript
const response = await api.get(`/customizations/${productId}`);
const rules = response.rules; // ProductRule[]
const legacyRules = response.legacy_rules; // Antigas customizações
```

---

✅ **Sistema pronto para uso!** Basta integrar na página do produto conforme as instruções acima.
