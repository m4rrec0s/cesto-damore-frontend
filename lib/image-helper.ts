export function getInternalImageUrl(
  url: string | null | undefined,
  size: "w500" | "w800" | "w1200" | "w1600" = "w1200",
): string {
  if (!url) return "";

  // Keep src stable across SSR/client hydration to avoid re-request flicker.
  const normalized = url.trim();

  if (
    normalized.includes("drive.google.com") ||
    normalized.includes("drive.usercontent.google.com")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(normalized)}&size=${size}`;
  }

  return normalized;
}
