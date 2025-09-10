import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#FF9500",
          accent: "#FFB800",
          surface: "#F8F9FA",
          white: "#FFFFFF",
          black: "#000000",
          gray: {
            dark: "#232F3E",
            medium: "#565959",
            light: "#E5E5E5",
            border: "#D5D9D9",
          },
          success: "#067D62",
          warning: "#FF9500",
          error: "#D13212",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Arial",
          "Helvetica",
          "sans-serif",
        ],
      },
      fontSize: {
        hero: "2.5rem",
        h1: "2rem",
        h2: "1.5rem",
        h3: "1.25rem",
        body: "0.875rem",
        sm: "0.75rem",
        xs: "0.625rem",
      },
      lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.6",
      },
      spacing: {
        "0": "0px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
      },
      maxWidth: {
        site: "1200px",
      },
      boxShadow: {
        card: "0 2px 4px -2px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
