/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gris neutres et chauds, sable pour la sélection : la palette de RimWorld.
        slate: {
          50: '#f2f2ef',
          100: '#e6e5e0',
          200: '#d6d5ce',
          300: '#bcbbb3',
          400: '#98978f',
          500: '#767570',
          600: '#5b5b56',
          700: '#464743',
          800: '#373835',
          900: '#2a2b29',
          950: '#191a19',
        },
        primary: {
          50: '#faf6e8',
          100: '#f3eacb',
          200: '#ecdca9',
          300: '#e6d092',
          400: '#d9bd74',
          500: '#c5a557',
          600: '#9f8541',
          700: '#7d6832',
          800: '#5e4e26',
          900: '#45391c',
          950: '#2a2311',
        },
        genetic: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        ecosystem: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        }
      },
      // Aucun angle arrondi, comme dans RimWorld ; full reste pour les points de couleur.
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Calibri', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}