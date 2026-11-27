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
        /* Master SafeHER Palette */
        bg: '#070908',
        panel: {
          DEFAULT: '#0d1110',
          secondary: '#111716',
          glass: 'rgba(13, 17, 16, 0.82)',
        },
        ink: '#f0f2eb',
        muted: '#929b93',
        accent: {
          DEFAULT: '#d5ff54',
          hover: '#e2ff84',
          secondary: '#a8db35',
          soft: 'rgba(213, 255, 84, 0.10)',
          glow: 'rgba(213, 255, 84, 0.24)',
        },
        coral: {
          DEFAULT: '#ff927e',
          soft: 'rgba(255, 146, 126, 0.12)',
          border: 'rgba(255, 146, 126, 0.42)',
        },
        line: {
          DEFAULT: 'rgba(225, 239, 221, 0.15)',
          strong: 'rgba(225, 239, 221, 0.28)',
          accent: 'rgba(213, 255, 84, 0.38)',
        },

        /* Semantic Role Bindings (Strictly Mapped to Master Palette) */
        background: {
          DEFAULT: '#070908',
          secondary: '#0d1110',
          tertiary: '#111716',
        },
        surface: {
          DEFAULT: '#0d1110',
          raised: '#111716',
          glass: 'rgba(13, 17, 16, 0.82)',
          low: '#070908',
          container: '#0d1110',
          high: '#111716',
          card: 'rgba(13, 17, 16, 0.90)',
          border: 'rgba(225, 239, 221, 0.15)',
        },
        primary: {
          DEFAULT: '#d5ff54',
          hover: '#e2ff84',
          soft: 'rgba(213, 255, 84, 0.10)',
          glow: 'rgba(213, 255, 84, 0.24)',
          light: '#d5ff54',
          cyan: '#a8db35',
        },
        trust: {
          DEFAULT: '#a8db35',
          soft: 'rgba(168, 219, 53, 0.12)',
        },
        verified: {
          DEFAULT: '#a8db35',
          soft: 'rgba(168, 219, 53, 0.12)',
        },
        warning: {
          DEFAULT: '#ff927e',
          soft: 'rgba(255, 146, 126, 0.12)',
          light: '#ff927e',
        },
        danger: {
          DEFAULT: '#ff927e',
          soft: 'rgba(255, 146, 126, 0.12)',
          light: '#ff927e',
        },
        critical: {
          DEFAULT: '#ff927e',
          soft: 'rgba(255, 146, 126, 0.12)',
          light: '#ff927e',
        },
        safe: {
          DEFAULT: '#a8db35',
          soft: 'rgba(168, 219, 53, 0.12)',
          light: '#a8db35',
        },
        apptext: {
          primary: '#f0f2eb',
          secondary: '#929b93',
          muted: '#929b93',
          disabled: '#707970',
        },
        border: {
          DEFAULT: 'rgba(225, 239, 221, 0.15)',
          hover: 'rgba(213, 255, 84, 0.45)',
          strong: 'rgba(225, 239, 221, 0.28)',
        },

        /* Compatibility aliases mapped to SafeHER palette */
        zcyan: {
          DEFAULT: '#d5ff54',
          hover: '#e2ff84',
          glow: 'rgba(213, 255, 84, 0.24)',
          soft: 'rgba(213, 255, 84, 0.10)',
          border: 'rgba(213, 255, 84, 0.42)',
        },
        zcharcoal: '#0d1110',
        ztext: {
          white: '#f0f2eb',
          variant: '#c8d0c8',
          muted: '#929b93',
          subtle: '#707970',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        headline: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        accent: ['"Italianno"', 'Georgia', 'cursive'],
        script: ['"Italianno"', 'Georgia', 'cursive'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: [
          '"DM Sans"',
          '"Noto Sans Devanagari"',
          '"Noto Sans Kannada"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 16px 44px rgba(0, 0, 0, 0.55)',
        'lime-glow': '0 0 25px -5px rgba(213, 255, 84, 0.30)',
        'coral-glow': '0 0 25px -5px rgba(255, 146, 126, 0.25)',
        'critical-glow': '0 0 25px -5px rgba(255, 146, 126, 0.28)',
      },
      borderRadius: {
        'sh-xs': '3px',
        'sh-sm': '4px',
        'sh-md': '8px',
        'sh-lg': '12px',
      },
    },
  },
  plugins: [],
}
