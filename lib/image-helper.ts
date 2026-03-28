export function getInternalImageUrl(
  url: string | null | undefined,
  size: "w500" | "w800" | "w1200" | "w1600" = "w1200",
): string {
  if (!url) return "";

  // Keep src stable across SSR/client hydration to avoid re-request flicker.
  const normalized = url.trim();
  const sanitized = normalized.split(/[?#]/)[0].toLowerCase();

  // Backward compatibility for legacy placeholder paths stored in DB.
  if (
    sanitized === "placeholder.png" ||
    sanitized.endsWith("/placeholder.png") ||
    sanitized === "placeholder-v2.png" ||
    sanitized.endsWith("/placeholder-v2.png")
  ) {
    return getPublicAssetUrl("placeholder-v2.png");
  }

  if (
    sanitized === "placeholder_design.png" ||
    sanitized.endsWith("/placeholder_design.png") ||
    sanitized === "placeholder_design-v2.png" ||
    sanitized.endsWith("/placeholder_design-v2.png")
  ) {
    return getPublicAssetUrl("placeholder_design-v2.png");
  }

  if (
    normalized.includes("drive.google.com") ||
    normalized.includes("drive.usercontent.google.com")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(normalized)}&size=${size}`;
  }

  return normalized;
}

export function getPublicAssetUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const rawBaseUrl =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env
          ?.BASE_URL
      : undefined;
  const baseUrl =
    rawBaseUrl && rawBaseUrl !== "/"
      ? rawBaseUrl.replace(/\/+$/, "")
      : "";
  return `${baseUrl}${normalizedPath}`;
}
