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
        parchment: {
          50: '#FAF8F5',
          100: '#F4EFE6',
          200: '#EAE2D2',
          300: '#DCD0BB',
          400: '#C2B194',
          500: '#A48E6E',
          800: '#4A3B2C',
          900: '#2A1F16',
        },
        heritage: {
          50: '#FBF9F3',
          100: '#F5EFE0',
          200: '#E8DCBF',
          300: '#D8C397',
          400: '#C4A56B',
          500: '#A88440', // Deep archival bronze
          600: '#8A672B',
          700: '#6C4E1E',
          800: '#4E3614',
          900: '#32210B',
        },
        national: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          500: '#334E68',
          700: '#1B2A4A', // National archive navy
          800: '#102A43',
          900: '#0B1A2E',
        },
        ink: {
          50: '#F6F8FA',
          100: '#E1E4E8',
          300: '#959DA5',
          600: '#444D56',
          700: '#2F363D',
          800: '#1E2328',
          900: '#13161A', // India ink archival black
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'archival': '0 4px 20px -2px rgba(18, 22, 26, 0.08), 0 2px 6px -1px rgba(18, 22, 26, 0.04)',
        'archival-hover': '0 10px 25px -3px rgba(18, 22, 26, 0.12), 0 4px 10px -2px rgba(18, 22, 26, 0.06)',
      }
    },
  },
  plugins: [],
}
