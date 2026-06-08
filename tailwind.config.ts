import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './v2/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#C9A84C',
        'gold-hover': '#B8973B',
        sand: '#F2EDE4',
        'warm-white': '#FAFAF8',
        'body-text': '#3D3532',
        muted: '#8C7B6B',
        chababa: '#D4A017',
        'interlaken-a': '#E07B39',
        lantana: '#4A90D9',
        transnet: '#6B4FA0',
        cream: '#fafafa',
        'deep-earth': '#0a0a0a',
        terracotta: '#0a0a0a',
        'terracotta-light': '#404040',
        'warm-sand': '#e5e5e5',
        'body-brown': '#262626',
        'muted-brown': '#525252',
        'amber-pale': '#e5e5e5',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-sm': ['clamp(36px, 5vw, 64px)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(52px, 8vw, 96px)', { lineHeight: '0.92', letterSpacing: '-0.02em' }],
        'label': ['11px', { lineHeight: '1', letterSpacing: '0.2em' }],
      },
      spacing: {
        'section': '120px',
        'section-sm': '64px',
      },
      boxShadow: {
        'card': '0 2px 20px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.15)',
        'gold-glow': '0 0 20px rgba(201, 168, 76, 0.3)',
      },
    },
  },
  plugins: [],
}
export default config
