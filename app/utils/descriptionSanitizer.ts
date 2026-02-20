export function sanitizeProductDescription(description: string | null | undefined): string {
  if (!description) return "";

  let sanitized = String(description);

  // Remove [INFORMACAO_INTERNA] section (até próxima quebra de linha)
  sanitized = sanitized.replace(/\[INFORMACAO_INTERNA\][^\n]*/gi, "");

  // Remove TAGS section (até próxima quebra de linha)
  sanitized = sanitized.replace(/TAGS[^\n]*/gi, "");

  // Remove linhas vazias múltiplas
  sanitized = sanitized.replace(/\n\s*\n+/g, "\n");

  // Trim do resultado
  sanitized = sanitized.trim();

  return sanitized;
}
