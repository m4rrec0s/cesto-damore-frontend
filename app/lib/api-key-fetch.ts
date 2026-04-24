export function installApiKeyFetchInterceptor() {
  // Mantido para compatibilidade. O x-api-key agora é injetado no servidor
  // via rotas internas do Next.js (/api/backend/*), sem expor segredo no cliente.
}
