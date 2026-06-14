/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07070c',
          900: '#0a0a0f',
          800: '#111118',
          750: '#16161f',
          700: '#1e1e2a',
          600: '#2a2a3a',
        },
        accent: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        }
      },
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 8s ease-in-out infinite',
        'in': 'animate-in 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
