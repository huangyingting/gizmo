import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gizmo: {
          purple: '#7C3AED',
          purpleLight: '#EDE9FE',
          purpleDark: '#5B21B6',
          pink: '#EC4899',
          green: '#16A34A',
          greenLight: '#DCFCE7',
          amber: '#F59E0B',
          surface: '#F8FAFC',
          card: '#FFFFFF',
          ink: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
