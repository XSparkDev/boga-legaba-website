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
        // Boga Legaba Brand Guidelines. NOTE: main-site pages get these
        // tokens from app/globals.css (CSS-based @theme, which takes
        // precedence over this JS config where names overlap — verified).
        // This file is kept in sync anyway so it never shows stale values.
        // cream/deep-earth/terracotta*/warm-sand/body-brown/muted-brown/
        // amber-pale are intentionally left untouched — they belong to the
        // separate /v2 alternate site, out of scope for this restyle.
        gold: '#996948',
        'gold-hover': '#000000',
        sand: '#F7F7F6',
        'warm-white': '#FFFFFF',
        'body-text': '#000000',
        muted: '#6B6B6B',
        chababa: '#C1C4C2',
        'interlaken-a': '#73CAC3',
        lantana: '#7A8850',
        transnet: '#996948',
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
        // Main-site pages get fonts from app/globals.css (CSS @theme takes
        // precedence, verified) — kept in sync here for consistency.
        display: ['Montserrat', 'Arial', 'sans-serif'],
        body: ['Open Sans', 'Arial', 'sans-serif'],
        sans: ['Open Sans', 'Arial', 'sans-serif'],
        mono: ['Open Sans', 'Arial', 'sans-serif'],
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
        // Brand guide: no drop shadows/glows. Kept as no-op tokens (also
        // neutralized in app/globals.css, which takes precedence).
        'card': 'none',
        'card-hover': 'none',
        'gold-glow': 'none',
      },
    },
  },
  plugins: [],
}
export default config
