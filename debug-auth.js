/**
 * Script de Debug para Autenticação
 * Cole este código no console do navegador (F12) para diagnosticar problemas de autenticação
 */

console.log("🔍 Iniciando diagnóstico de autenticação...\n");

// 1. Verificar Token
console.log("1️⃣ Verificando token...");
const token = localStorage.getItem("token") || localStorage.getItem("appToken");
const tokenKey = localStorage.getItem("appToken") ? "appToken" : "token";

if (!token) {
    console.error("❌ Token não encontrado no localStorage");
    console.log("➡️ Solução: Faça login em http://localhost:3000/login");
} else {
    console.log(`✅ Token encontrado em '${tokenKey}'`);
    console.log("📋 Token (primeiros 30 caracteres):", token.substring(0, 30) + "...");

    // Tentar decodificar JWT
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("📦 Payload do token:", payload);

        // Verificar expiração
        if (payload.exp) {
            const expirationDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = now > expirationDate;

            if (isExpired) {
                console.error("❌ Token expirado em:", expirationDate.toLocaleString());
                console.log("➡️ Solução: Faça login novamente");
            } else {
                console.log("✅ Token válido até:", expirationDate.toLocaleString());
                const hoursLeft = ((expirationDate - now) / 1000 / 60 / 60).toFixed(1);
                console.log(`⏰ Tempo restante: ${hoursLeft} horas`);
            }
        }
    } catch (err) {
        console.warn("⚠️ Não foi possível decodificar o token (pode não ser JWT)", err);
    }
}// 2. Verificar Usuário
console.log("\n2️⃣ Verificando dados do usuário...");
const userStr = localStorage.getItem("user");
if (!userStr) {
    console.error("❌ Dados do usuário não encontrados");
} else {
    try {
        const user = JSON.parse(userStr);
        console.log("✅ Usuário logado:");
        console.table(user);
    } catch (err) {
        console.error("❌ Erro ao parsear dados do usuário:", err);
    }
}

// 3. Verificar Conectividade com Backend
console.log("\n3️⃣ Testando conexão com backend...");
const API_URL = "http://localhost:8080/api";

if (token) {
    console.log("🔄 Fazendo requisição de teste para /admin/layouts...");

    fetch(`${API_URL}/admin/layouts`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true"
        }
    })
        .then(async response => {
            console.log("📡 Status da resposta:", response.status, response.statusText);

            if (response.status === 401) {
                console.error("❌ 401 Unauthorized - Token inválido ou expirado");
                console.log("➡️ Solução: Faça login novamente");
            } else if (response.status === 403) {
                console.error("❌ 403 Forbidden - Sem permissão");
                console.log("➡️ Solução: Verifique se o usuário tem role de admin");
            } else if (response.status === 404) {
                console.error("❌ 404 Not Found - Endpoint não existe");
                console.log("➡️ Solução: Verifique se o backend está rodando corretamente");
            } else if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error("❌ Erro:", error);
            } else {
                const data = await response.json();
                console.log("✅ Requisição bem-sucedida!");
                console.log("📊 Dados recebidos:", data);
                console.log(`📦 Total de layouts: ${Array.isArray(data) ? data.length : 'N/A'}`);
            }
        })
        .catch(err => {
            console.error("❌ Erro de rede:", err.message);
            console.log("➡️ Possíveis causas:");
            console.log("  - Backend não está rodando");
            console.log("  - URL incorreta");
            console.log("  - Problema de CORS");
        });
} else {
    console.warn("⚠️ Pulando teste de requisição (sem token)");
}

// 4. Informações Adicionais
console.log("\n4️⃣ Informações do ambiente:");
console.log("🌐 URL atual:", window.location.href);
console.log("🔧 API URL configurada:", API_URL);
console.log("📅 Data/hora local:", new Date().toLocaleString());

// 5. Ações Rápidas
console.log("\n5️⃣ Ações rápidas disponíveis:");
console.log(`
// Limpar autenticação:
localStorage.removeItem("token");
localStorage.removeItem("user");
location.reload();

// Definir token manualmente (substitua SEU_TOKEN):
localStorage.setItem("token", "SEU_TOKEN_AQUI");
localStorage.setItem("user", JSON.stringify({
  id: "user-id",
  name: "Nome",
  email: "email@example.com"
}));
location.reload();

// Testar login via API:
fetch("${API_URL}/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@example.com",
    password: "sua_senha"
  })
})
.then(r => r.json())
.then(data => {
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    console.log("✅ Login bem-sucedido!");
    location.reload();
  }
})
.catch(console.error);
`);

console.log("\n✅ Diagnóstico concluído!");
