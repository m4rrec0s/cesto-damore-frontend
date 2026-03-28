const EMBEDDED_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e5e7eb"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#bg)"/>
    <rect x="220" y="140" width="760" height="520" rx="40" fill="#d1d5db"/>
    <circle cx="430" cy="340" r="70" fill="#9ca3af"/>
    <path d="M260 600l210-170 120 100 150-130 240 200z" fill="#9ca3af"/>
  </svg>`,
)}`;

const EMBEDDED_DESIGN_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff1f2"/>
        <stop offset="100%" stop-color="#ffe4e6"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#bg2)"/>
    <rect x="170" y="90" width="860" height="620" rx="36" fill="#fecdd3"/>
    <rect x="210" y="130" width="780" height="540" rx="20" fill="#ffe4e6"/>
    <circle cx="460" cy="330" r="72" fill="#fb7185"/>
    <path d="M250 610l230-180 120 90 140-120 220 210z" fill="#f43f5e"/>
  </svg>`,
)}`;

export function getEmbeddedPlaceholderDataUrl(): string {
  return EMBEDDED_PLACEHOLDER;
}

export function getEmbeddedDesignPlaceholderDataUrl(): string {
  return EMBEDDED_DESIGN_PLACEHOLDER;
}

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
    return getEmbeddedPlaceholderDataUrl();
  }

  if (
    sanitized === "placeholder_design.png" ||
    sanitized.endsWith("/placeholder_design.png") ||
    sanitized === "placeholder_design-v2.png" ||
    sanitized.endsWith("/placeholder_design-v2.png")
  ) {
    return getEmbeddedDesignPlaceholderDataUrl();
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
  const sanitized = normalizedPath.split(/[?#]/)[0].toLowerCase();

  if (
    sanitized.endsWith("/placeholder.png") ||
    sanitized.endsWith("/placeholder-v2.png")
  ) {
    return getEmbeddedPlaceholderDataUrl();
  }

  if (
    sanitized.endsWith("/placeholder_design.png") ||
    sanitized.endsWith("/placeholder_design-v2.png")
  ) {
    return getEmbeddedDesignPlaceholderDataUrl();
  }

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
