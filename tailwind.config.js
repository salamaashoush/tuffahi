/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'apple-red': '#fa243c',
        'apple-pink': '#fb5c74',
        surface: {
          DEFAULT: '#1c1c1e',
          secondary: '#2c2c2e',
          tertiary: '#3a3a3c',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
