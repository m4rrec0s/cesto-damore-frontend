/**
 * Simples logger para frontend
 * Outputs to browser console com formatação
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
  info: (message: string, data?: unknown) => {
    if (isDev) {
      console.log(`ℹ️ ${message}`, data);
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`🔍 ${message}`, data);
    }
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`⚠️ ${message}`, data);
  },

  error: (message: string, error?: unknown) => {
    console.error(`❌ ${message}`, error);
  },

  success: (message: string, data?: unknown) => {
    console.log(`✅ ${message}`, data);
  },
};

export default logger;
