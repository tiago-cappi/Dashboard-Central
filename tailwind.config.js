/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          1: '#f4ead5',
          2: '#ebe0c3',
          3: '#faf3e0',
          4: '#f0e4c4',
        },
        ink: {
          DEFAULT: '#3a2a18',
          dark: '#1f1408',
          soft: '#5b4423',
        },
        gold: {
          DEFAULT: '#a88a3d',
          2: '#c9a14a',
          3: '#d9bc6e',
        },
        wine: {
          DEFAULT: '#6b1f2a',
          2: '#7a2230',
          3: '#4a1620',
        },
        navy: {
          DEFAULT: '#1f3a5f',
          2: '#16294a',
        },
        moss: {
          DEFAULT: '#4a6b3a',
          2: '#3a5430',
        },
        terracotta: '#a8553a',
        slate: '#4a5568',
        wood: {
          DEFAULT: '#3a2818',
          2: '#28190d',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        eb: ['"EB Garamond"', 'serif'],
        lora: ['Lora', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
      },
    },
  },
  plugins: [],
};
