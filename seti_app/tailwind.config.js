/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1d3557",
        secondary: "#457b9d",
        accent: "#e63946",
        background: "#f1faee",
        surface: "#ffffff",
        text: "#1d3557",
        textLight: "#a8dadc",
      },
    },
  },
  plugins: [],
};
