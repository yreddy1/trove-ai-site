/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./about.html", "./solutions.html", "./contact.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        heading: [
          "Space Grotesk",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        trove: {
          dark: "#0B1220",
          lime: "#A1C34E",
        },
      },
    },
  },
  plugins: [],
};
