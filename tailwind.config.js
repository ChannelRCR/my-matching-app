/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A", // Deep Navy (Trust & Professionalism)
        secondary: "#F8FAFC", // Clean Slate-50
        accent: "#D4AF37", // Gold (Wealth & Quality)
      }
    },
  },
  plugins: [],
}
