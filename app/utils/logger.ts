const isDev = process.env.NODE_ENV === "development";

const redactKeys = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "token",
  "appToken",
  "password",
  "headers",
  "request",
  "response",
  "config",
  "stack",
]);

const safeSerialize = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const sanitize = (input: unknown): unknown => {
    if (input instanceof Error) {
      return {
        name: input.name,
        message: input.message,
      };
    }

    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input !== "object") {
      return input;
    }

    if (seen.has(input)) {
      return "[Circular]";
    }

    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => sanitize(item));
    }

    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      out[key] = redactKeys.has(key) ? "[REDACTED]" : sanitize(nested);
    }
    return out;
  };

  try {
    return typeof value === "string" ? value : JSON.stringify(sanitize(value));
  } catch {
    return "[Unserializable]";
  }
};

export const logger = {
  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`ℹ️ ${message}`, data === undefined ? "" : safeSerialize(data));
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`🔍 ${message}`, data === undefined ? "" : safeSerialize(data));
    }
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`⚠️ ${message}`, data === undefined ? "" : safeSerialize(data));
  },

  error: (message: string, error?: unknown) => {
    console.error(`❌ ${message}`, error === undefined ? "" : safeSerialize(error));
  },

  success: (message: string, data?: unknown) => {
    console.log(`✅ ${message}`, data === undefined ? "" : safeSerialize(data));
  },
};

export default logger;
