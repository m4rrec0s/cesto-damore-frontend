const BLOCKED_KEYS = new Set([
  "files",
  "file",
  "imageBuffer",
  "buffer",
  "blob",
  "base64",
  "base64Data",
  "fileBuffer",
]);

const URL_LIKE_KEY = /preview|image|url|artwork|base64/i;

const isFileLike = (value: unknown): boolean => {
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (typeof Blob !== "undefined" && value instanceof Blob) return true;
  return false;
};

const shouldStripString = (key: string, value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  
  // Only strip if it's actually a base64/blob data URL
  // Don't strip HTTP/HTTPS URLs even if key matches the pattern
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  
  // Only strip data: and blob: URLs from URL-like keys
  if (!URL_LIKE_KEY.test(key)) return false;
  return trimmed.startsWith("data:") || trimmed.startsWith("blob:");
};

const sanitizeValue = (value: unknown, parentKey?: string): unknown => {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeValue(item, parentKey))
      .filter((item) => {
        if (item === undefined) return false;
        if (
          typeof item === "string" &&
          parentKey &&
          shouldStripString(parentKey, item)
        ) {
          return false;
        }
        return true;
      });
    return items;
  }

  if (typeof value === "object") {
    if (isFileLike(value)) return undefined;

    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    Object.entries(record).forEach(([key, val]) => {
      if (key.startsWith("_")) return;
      if (BLOCKED_KEYS.has(key)) return;
      const cleaned = sanitizeValue(val, key);
      if (cleaned === undefined) return;
      if (typeof cleaned === "string" && shouldStripString(key, cleaned)) {
        return;
      }
      result[key] = cleaned;
    });

    return result;
  }

  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;

  return undefined;
};

export const normalizeCustomizationData = (
  input: unknown,
): Record<string, unknown> => {
  if (!input || typeof input !== "object") return {};
  const sanitized = sanitizeValue(input);
  if (!sanitized || typeof sanitized !== "object") return {};
  return sanitized as Record<string, unknown>;
};

export const safeParseCustomizationJson = (
  input: unknown,
): Record<string, unknown> => {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return normalizeCustomizationData(parsed);
    } catch {
      return {};
    }
  }
  return normalizeCustomizationData(input);
};
