# Especificação do Endpoint de Upload de Imagens

## 📋 Visão Geral

O sistema foi atualizado para usar upload de arquivos ao invés de URLs de imagem. Este documento especifica como o backend deve implementar o endpoint `/upload`.

## 🔧 Endpoint Required

### POST /upload

#### Request

- **Content-Type**: `multipart/form-data`
- **Body**: Form data com campo `image` contendo o arquivo

#### Response

```json
{
  "url": "https://example.com/uploads/images/12345-image.jpg"
}
```

#### Exemplo de implementação (Node.js/Express):

```javascript
const multer = require("multer");
const path = require("path");

// Configurar storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos de imagem são permitidos!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Rota de upload
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  // Construir URL pública do arquivo
  const baseUrl = process.env.BASE_URL || "http://localhost:8080";
  const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;

  res.json({ url: imageUrl });
});

// Servir arquivos estáticos
app.use("/uploads", express.static("uploads"));
```

## ⚠️ Validações Necessárias

### Frontend (já implementado):

- ✅ Verificação de tipo MIME (apenas imagens)
- ✅ Limite de tamanho (5MB)
- ✅ Feedback visual durante upload
- ✅ Tratamento de erros

### Backend (a implementar):

- 🔲 Validação de tipo de arquivo
- 🔲 Limite de tamanho
- 🔲 Sanitização do nome do arquivo
- 🔲 Proteção contra uploads maliciosos
- 🔲 Limpeza de arquivos órfãos

## 🗂️ Estrutura de Pastas Sugerida

```
backend/
├── uploads/
│   └── images/
│       ├── 1234567890-product1.jpg
│       ├── 1234567891-additional1.png
│       └── ...
├── routes/
│   └── upload.js
└── middleware/
    └── upload.js
```

## 🔒 Considerações de Segurança

1. **Validação de tipo**: Verificar MIME type e extensão
2. **Limite de tamanho**: Evitar uploads muito grandes
3. **Sanitização**: Remover caracteres perigosos do nome
4. **Localização**: Armazenar fora do webroot se possível
5. **Autenticação**: Verificar se usuário tem permissão
6. **Rate limiting**: Evitar spam de uploads

## 📊 Integração com Banco de Dados

Quando um produto/adicional é salvo, o campo `image_url` deve armazenar a URL completa retornada pelo endpoint de upload:

```sql
-- Exemplo de estrutura
UPDATE products
SET image_url = 'https://example.com/uploads/images/12345-image.jpg'
WHERE id = ?;
```

## 🧹 Limpeza de Arquivos

Implementar rotina para remover arquivos órfãos:

```javascript
// Exemplo de limpeza
const fs = require("fs");
const path = require("path");

async function cleanupOrphanedFiles() {
  // 1. Listar todos os arquivos em uploads/images/
  // 2. Consultar banco para URLs em uso
  // 3. Remover arquivos não referenciados
}
```

## ✅ Checklist de Implementação

### Backend:

- [ ] Criar endpoint POST /upload
- [ ] Configurar multer ou similar
- [ ] Implementar validações
- [ ] Configurar pasta de uploads
- [ ] Servir arquivos estáticos
- [ ] Adicionar tratamento de erros
- [ ] Implementar limpeza de arquivos

### Testes:

- [ ] Upload de imagem válida
- [ ] Rejeição de arquivo não-imagem
- [ ] Limite de tamanho
- [ ] Erro sem arquivo
- [ ] URL retornada funcional

## 🎯 Resultado Esperado

Após a implementação, o sistema permitirá:

1. **Upload via drag & drop** ou seleção de arquivo
2. **Preview instantâneo** da imagem
3. **Validação em tempo real**
4. **Armazenamento seguro** no servidor
5. **URLs públicas** para exibição

O frontend já está 100% preparado para esta funcionalidade!
