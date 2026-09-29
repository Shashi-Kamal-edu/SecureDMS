/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0B1220',
          900: '#0F1A2B',
          800: '#152238',
          700: '#1D2E4A',
          600: '#2A3F60',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4F5FE0',
          600: '#3D4ECC',
          700: '#323FA3',
          800: '#2A3480',
          900: '#242C63',
        },
        verified: {
          50: '#ECFDF3',
          100: '#D3F8DF',
          500: '#1F9D55',
          600: '#188245',
          700: '#146838',
        },
        alert: {
          50: '#FEF2F2',
          100: '#FDE2E2',
          500: '#D64545',
          600: '#B93636',
          700: '#932A2A',
        },
        pending: {
          50: '#FFFAEB',
          100: '#FEF0C7',
          500: '#DC9A2C',
          600: '#B87F1F',
          700: '#946318',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 26, 43, 0.06), 0 1px 3px 0 rgba(15, 26, 43, 0.08)',
      },
    },
  },
  plugins: [],
};
