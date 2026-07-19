/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        fleur: {
          50: '#fdf3f6',
          100: '#fbe4ea',
          200: '#f6c6d5',
          300: '#efa0b8',
          400: '#e5708f',
          500: '#d84a6e',
          600: '#c02f55',
          700: '#a12246',
          800: '#861f3d',
          900: '#731d38',
        },
      },
    },
  },
  plugins: [],
};
