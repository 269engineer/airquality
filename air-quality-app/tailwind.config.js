/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0A1628',
          800: '#0D2137',
          700: '#0F2D4A',
        },
        air: {
          primary: '#065A82',
          secondary: '#1C7293',
          accent: '#02C39A',
        },
      },
    },
  },
  plugins: [],
}
