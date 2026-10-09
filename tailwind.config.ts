import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pup: {
          50: "#fef2f2",
          100: "#fde2e4",
          200: "#f9bfc4",
          300: "#f08a97",
          400: "#e05968",
          500: "#cc2936",
          600: "#a81a27",
          700: "#7A0010",
          800: "#61000e",
          900: "#4b000b",
          950: "#250307",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
