/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F172A', // Navy Dark
          light: '#3B82F6',   // Professional Blue
          premium: '#F59E0B', // Premium Gold/Amber
        },
        accent: {
          DEFAULT: '#22C55E',
          gold: '#CA8A04',   // Deep Gold
        },
        danger: '#EF4444',
      },
      fontFamily: {
        archivo: ['Archivo', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
