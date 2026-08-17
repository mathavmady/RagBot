/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        crimson: {
          50:  '#FFF0F0',
          100: '#FFE0E0',
          200: '#FFC5C5',
          300: '#FF9494',
          400: '#FF5757',
          500: '#FF2222',
          600: '#E60000',
          700: '#C80000',
          800: '#A50000',
          900: '#8A0000',
          950: '#4C0000',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'sharp':   '4px 4px 0px #C80000',
        'card':    '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.05)',
        'modal':   '0 20px 60px rgba(0,0,0,0.15)',
        'red':     '0 8px 30px rgba(200,0,0,0.20)',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease both',
        'fade-in':    'fadeIn 0.4s ease both',
        'slide-in':   'slideIn 0.3s ease both',
        'pulse-red':  'pulseRed 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s linear infinite',
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn:  { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        pulseRed: { '0%,100%': { boxShadow: '0 0 0 0 rgba(200,0,0,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(200,0,0,0)' } },
        shimmer:  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
