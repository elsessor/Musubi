import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/services/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/store/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/utils/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F3A68",
          deep: "#1B335C",
          soft: "#E8EEF7"
        },
        accent: {
          DEFAULT: "#3B82F6",
          soft: "#DBEAFE"
        },
        page: "#F5F7FA"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(31, 58, 104, 0.08)",
        input: "0 2px 8px rgba(31, 58, 104, 0.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "16px"
      }
    }
  },
  plugins: []
};

export default config;
