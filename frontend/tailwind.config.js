/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbf4',
          100: '#e2f7e7',
          200: '#c5eecd',
          300: '#97deb2',
          400: '#60c68c',
          500: '#3ba96e',
          600: '#2d8955',
          700: '#256c44',
          800: '#1f5637',
          900: '#1a472e',
          950: '#0e2619',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
