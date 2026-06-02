/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // New design system
        'ui': {
          'bg': '#09090B',
          'secondary': '#111827',
          'border': 'rgba(255,255,255,0.08)',
        },
        'accent': {
          'primary': '#A3E635',
          'secondary': '#818CF8',
        },
        'status': {
          'success': '#22C55E',
          'danger': '#EF4444',
        },
      },
      borderRadius: {
        'xl': '24px',
      },
      boxShadow: {
        'card': '0 10px 40px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
