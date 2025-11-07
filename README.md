# Cesto d'Amore - E-commerce Gourmet

## 🎯 Visão Geral

O **Cesto d'Amore** é uma plataforma e-commerce moderna e clean focada em produtos artesanais gourmet. A aplicação combina um design elegante com funcionalidades robustas de gerenciamento de estoque.

## ✨ Melhorias Implementadas

### 🎨 Design Visual Modernizado

- **Hero Section renovada** com animações sutis e elementos flutuantes
- **Layout responsivo** otimizado para todas as telas
- **Paleta de cores** atualizada com tons de laranja (#FF9500) como cor principal
- **Tipografia** aprimorada com hierarquia visual clara
- **Cards de produto** com hover effects e micro-interações
- **Header** com busca integrada e navegação intuitiva
- **Footer** com informações de contato e links organizados

### 🏪 Página Principal Aprimorada

- **Seção de categorias** com cards visuais atrativos
- **Grid de produtos** otimizado com informações detalhadas
- **Estados de loading** e error com feedback visual
- **Estatísticas** de produtos, clientes e avaliações
- **Call-to-actions** bem posicionados

### 📦 Sistema de Controle de Estoque Completo

#### Funcionalidades Principais:

1. **Dashboard de Visão Geral**

   - Estatísticas em tempo real
   - Gráficos de distribuição por categoria/tipo
   - Métricas financeiras do estoque
   - Alertas para categorias sem produtos

2. **Gerenciamento de Produtos**

   - CRUD completo com interface moderna
   - Upload de imagens via drag & drop ou seleção
   - Filtros por categoria e tipo
   - Busca em tempo real
   - Modal de edição responsivo
   - Preview de imagem instantâneo

3. **Gerenciamento de Categorias**

   - Interface simplificada para CRUD
   - Cards organizados com informações essenciais
   - Busca e filtros

4. **Gerenciamento de Tipos**

   - Interface compacta e eficiente
   - Grid responsivo
   - Operações rápidas

5. **Gerenciamento de Adicionais**
   - CRUD com upload de imagens via arquivo
   - Sistema de vinculação com produtos
   - Interface visual atrativa
   - Drag & drop para upload de imagens

#### Características Técnicas:

- **Navegação por abas** para organizar diferentes seções
- **Estados de loading** consistentes
- **Validação de formulários** robusta
- **Feedback visual** para todas as ações
- **Cache inteligente** com invalidação automática
- **Interface acessível** com labels e aria-labels

### 🔧 Melhorias Técnicas

#### Hooks e Performance:

- **useCallback**: Otimização de funções para evitar re-renders
- **useEffect**: Gerenciamento inteligente de efeitos colaterais
- **useMemo**: Memorização de valores computados caros
- **useState**: Estado local otimizado com updates batched

#### Componentes Reutilizáveis:

- **ProductCard** com ratings e ações rápidas
- **ProductGrid** flexível e responsivo
- **Modais** consistentes para formulários
- **Loading states** padronizados

#### Integração com API:

- **Cache em memória** para reduzir requisições
- **Invalidação automática** após operações CRUD
- **Error handling** robusto
- **TypeScript** para type safety

## 🛠️ Tecnologias Utilizadas

- **Next.js 15** - Framework React
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling utilitário
- **Lucide React** - Ícones consistentes
- **Axios** - Cliente HTTP

## 📱 Funcionalidades por Tela

### Homepage (/)

- Hero section com CTAs
- Seção de categorias
- Grid de produtos em destaque
- Loading states e error handling

### Controle de Estoque (/estoque)

- Dashboard com estatísticas
- Tabs para diferentes entidades
- CRUD completo para:
  - Produtos
  - Categorias
  - Tipos
  - Adicionais

## 🎯 Interface Destacada

### Design System

- **Tipografia**: Sistema hierárquico com tamanhos responsivos
- **Espaçamento**: Grid system de 4px
- **Border radius**: Consistente (8px para cards, 4px para inputs)
- **Shadows**: Sutis para depth

### Micro-interações

- **Hover effects** em cards e botões
- **Loading spinners** elegantes
- **Transition animations** suaves
- **Focus states** acessíveis

### 🖼️ Sistema de Upload de Imagens

#### Características:

- **Upload via arquivo** (não mais URLs)
- **Drag & drop** interface intuitiva
- **Preview instantâneo** da imagem
- **Validação de tipo** (apenas imagens)
- **Limite de tamanho** (5MB)
- **Feedback visual** durante upload
- **Remoção fácil** de imagens

#### Como Funciona:

1. **Frontend**: Componente `ImageUpload` gerencia seleção e upload
2. **API**: Endpoint `/upload` recebe arquivo e retorna URL
3. **Integração**: Hook `useApi` inclui função `uploadImage`
4. **Armazenamento**: Backend salva arquivo e retorna URL pública

#### Exemplo de Uso:

```tsx
<ImageUpload
  value={formData.image_url}
  onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
  className="w-full"
/>
```

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Acessar
http://localhost:3000
```

## 📊 Estrutura do Projeto

```
app/
├── components/
│   ├── layout/
│   │   ├── header.tsx       # Header com navegação
│   │   ├── footer-new.tsx   # Footer moderno
│   │   ├── hero.tsx         # Hero section
│   │   ├── product-card.tsx # Card de produto
│   │   └── product-grid.tsx # Grid de produtos
│   └── ui/
│       └── button.tsx       # Componente Button
├── estoque/
│   ├── page.tsx            # Página principal do estoque
│   └── components/
│       ├── stats-overview.tsx     # Dashboard estatísticas
│       ├── product-manager.tsx    # CRUD produtos
│       ├── category-manager.tsx   # CRUD categorias
│       ├── type-manager.tsx       # CRUD tipos
│       └── additional-manager.tsx # CRUD adicionais
├── hooks/
│   └── use-api.tsx         # Hook principal da API
├── globals.css             # Estilos globais
├── layout.tsx             # Layout principal
└── page.tsx               # Homepage
```

## 🎨 Destaques Visuais

### Cards Modernos

- **Gradientes sutis** para backgrounds
- **Imagens responsivas** com Next.js Image
- **Badges** para categorias e status
- **Actions** no hover

### Formulários Elegantes

- **Inputs** com focus rings coloridos
- **Labels** acessíveis
- **Validation** visual em tempo real
- **Loading states** nos botões

### Dashboard Informativo

- **Métricas** com ícones coloridos
- **Progress bars** para distribuições
- **Charts** visuais simples
- **Color coding** consistente

---

**Desenvolvido com ❤️ para uma experiência de usuário excepcional**
