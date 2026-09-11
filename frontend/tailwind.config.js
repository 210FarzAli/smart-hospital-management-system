/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          950: "#0b252c",
          900: "#0f4c5c",
          850: "#105466",
          800: "#135d6e",
          700: "#12667a",
          600: "#1a7c93",
          500: "#2a9d8f",
          400: "#45b3a6",
          300: "#74c9bf",
          200: "#a9dfd8",
          100: "#eaf6f5",
          50: "#f4faf9",
        },
        brand: {
          dark: "#0b252c",
          primary: "#0f4c5c",
          accent: "#2a9d8f",
          light: "#eaf6f5",
          surface: "#f8fafc",
        },
        amber: {
          500: "#f59e0b",
          600: "#e6a817",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(15, 76, 92, 0.05), 0 1px 2px 0 rgba(15, 76, 92, 0.03)",
        card: "0 4px 20px -2px rgba(15, 76, 92, 0.06), 0 2px 6px -1px rgba(15, 76, 92, 0.04)",
        dropdown: "0 10px 25px -3px rgba(15, 47, 54, 0.12), 0 4px 10px -2px rgba(15, 47, 54, 0.06)",
        float: "0 20px 35px -5px rgba(15, 47, 54, 0.15), 0 10px 15px -5px rgba(15, 47, 54, 0.08)",
      },
    },
  },
  plugins: [],
};
