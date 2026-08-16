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
          50: '#F4F7F5',   // Warm Sage tint
          100: '#E6EEEA',  // Soft Sage border
          200: '#C9DAD2',  // Light Sage
          300: '#A2C0B0',  // Muted Sage green
          400: '#7AA48F',  // Sage green primary
          500: '#5F8572',  // Sage olive
          600: '#244F3C',  // Deep forest green primary
          700: '#1C4030',  // Forest dark
          800: '#153225',  // Forest deeper
          900: '#0D2118',
          950: '#06110C',
        },
        accent: {
          50: '#FEF9F2',
          100: '#FFF0D9',
          200: '#FDE0B6',
          300: '#FAC887',
          400: '#F5A952',
          500: '#DF8C38',  // Accent Warm Amber
          600: '#C77521',
          700: '#A05A17',
          800: '#7B4210',
          900: '#61320B',
        },
        'natural-bg': '#FAF9F5',      // Warm cream / off-white background
        'natural-surface': '#FFFFFF', // Clean surface
        'natural-text': '#1D2A24',    // Dark forest charcoal text
        'natural-muted': '#5C6D64',   // Muted sage-charcoal text
        'natural-border': '#E4EAE5',  // Soft organic border
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
