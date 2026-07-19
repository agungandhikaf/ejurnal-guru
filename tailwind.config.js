/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#FFF5F9',
          100: '#FBDAE5',
          200: '#F9B7CF',
          300: '#F283AE',
          400: '#E85B91',
          500: '#D94A82',
          600: '#C43670',
          700: '#A52D60',
          800: '#87244F',
          900: '#701D42',
          950: '#470C27'
        },
        slate: {
          50: '#FBF4EA',
          100: '#F5EBDD',
          200: '#E8D9C9',
          300: '#CDBFB4',
          400: '#82736F',
          500: '#6B5B58',
          600: '#554744',
          700: '#423532',
          800: '#302522',
          900: '#211816',
          950: '#140D0C'
        },
        blush: {
          50: '#FFF5F9',
          100: '#FDEAF1',
          200: '#FBDAE5',
          300: '#F9B7CF',
          400: '#F283AE',
          500: '#E85B91'
        },
        apricot: {
          50: '#FFF9ED',
          100: '#FFF0CF',
          200: '#FFD592',
          300: '#FFC66A',
          400: '#F5AD42'
        }
      },
      boxShadow: {
        soft: '0 12px 30px rgba(196, 54, 112, 0.10)'
      }
    }
  },
  plugins: []
}
