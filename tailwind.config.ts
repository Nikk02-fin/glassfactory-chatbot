import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'glass': ['Glass', 'serif'],
        'inter-tight': ['Inter Tight', 'sans-serif'],
      },
      colors: {
        'neutral-0': '#fefefe',
        'neutral-100': '#f5f5f5',
        'neutral-200': '#e5e5e5',
        'neutral-300': '#d4d4d4',
        'neutral-400': '#a3a3a3',
        'neutral-500': '#737373',
        'neutral-600': '#525252',
        'neutral-700': '#404040',
        'neutral-800': '#262626',
        'neutral-900': '#171717',
        'neutral-950': '#0a0a0a',
        'primary-100': '#e0e7ff',
        'primary-500': '#0015ff',
        'secondary-blue': '#000d99',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90deg, #0015ff 0%, #000d99 81.25%)',
      },
      boxShadow: {
        'elevation-heavy': '0px 8px 32px rgba(0, 0, 0, 0.12)',
      },
      fontSize: {
        'h4': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'h5': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'body-regular': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-xs': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      },
      transitionDuration: {
        'button': '300ms',
      },
    },
  },
  plugins: [],
};

export default config;