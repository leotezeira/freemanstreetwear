import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(17,24,39,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
