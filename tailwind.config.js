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
        },
        accent: '#22C55E',    // Professional Green for Success
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
