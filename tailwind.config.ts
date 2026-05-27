import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0b",
        panel: "#111114",
        panel2: "#16161a",
        line: "#23232a",
        muted: "#8a8a93",
        ink: "#e6e6e9",
        accent: "#6ee7b7",
        danger: "#f87171",
        warn: "#fbbf24",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
