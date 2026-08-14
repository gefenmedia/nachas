import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nachas: {
          dark: "#0a1628",
          navy: "#1a2a4a",
          gold: "#f5c542",
          goldLight: "#f9d76e",
          teal: "#4ecdc4",
          coral: "#ff6b6b",
          purple: "#a855f7",
          green: "#22c55e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
