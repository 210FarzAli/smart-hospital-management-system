/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          950: "#0f2f36",
          900: "#0f4c5c",
          700: "#12667a",
          500: "#2a9d8f",
          100: "#eaf6f5",
          50: "#f4faf9",
        },
        amber: {
          600: "#e6a817",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
