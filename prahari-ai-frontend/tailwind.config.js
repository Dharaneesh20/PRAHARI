/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Ubuntu', 'sans-serif'],
      },
      colors: {
        gold: '#C9A227',
        'status-green': '#2E9E6C',
        'status-red': '#D14343',
      },
    },
  },
  plugins: [],
}