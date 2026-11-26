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
        // Midnight Aurora Official Foundation
        obsidian: '#080B18',
        'deep-midnight': '#0D1224',
        'slate-surface': '#171D35',
        'surface-elevated': '#1D2540',
        'surface-glass': 'rgba(23, 29, 53, 0.78)',

        // Midnight Aurora Primary Accents
        'aurora-violet': {
          DEFAULT: '#8B7CFF',
          hover: '#A99BFF',
          soft: 'rgba(139, 124, 255, 0.12)',
          glow: 'rgba(139, 124, 255, 0.24)',
        },
        'ice-cyan': {
          DEFAULT: '#55D6E8',
          hover: '#7BE2F1',
          soft: 'rgba(85, 214, 232, 0.12)',
          glow: 'rgba(85, 214, 232, 0.20)',
        },
        'soft-periwinkle': '#A99BFF',

        // Trust & Positive States
        'verification-mint': {
          DEFAULT: '#52D6B2',
          soft: 'rgba(82, 214, 178, 0.12)',
        },
        'trust-blue': {
          DEFAULT: '#648BFF',
          soft: 'rgba(100, 139, 255, 0.14)',
        },

        // Status Indicators
        'warning-amber': {
          DEFAULT: '#F0B96B',
          soft: 'rgba(240, 185, 107, 0.12)',
        },
        'high-risk-coral': {
          DEFAULT: '#FF718A',
          soft: 'rgba(255, 113, 138, 0.12)',
        },

        // Semantic Role Bindings (Midnight Aurora)
        background: {
          DEFAULT: '#080B18',
          secondary: '#0D1224',
          tertiary: '#171D35',
        },
        surface: {
          DEFAULT: '#171D35',
          raised: '#1D2540',
          glass: 'rgba(23, 29, 53, 0.78)',
          low: '#080B18',
          container: '#0D1224',
          high: '#1D2540',
          card: 'rgba(23, 29, 53, 0.85)',
          border: 'rgba(166, 174, 200, 0.14)',
        },
        primary: {
          DEFAULT: '#8B7CFF',
          hover: '#A99BFF',
          soft: 'rgba(139, 124, 255, 0.12)',
          glow: 'rgba(139, 124, 255, 0.24)',
          cyan: '#55D6E8',
        },
        trust: {
          DEFAULT: '#648BFF',
          soft: 'rgba(100, 139, 255, 0.14)',
        },
        verified: {
          DEFAULT: '#52D6B2',
          soft: 'rgba(82, 214, 178, 0.12)',
        },
        warning: {
          DEFAULT: '#F0B96B',
          soft: 'rgba(240, 185, 107, 0.12)',
          light: '#F0B96B',
        },
        danger: {
          DEFAULT: '#FF718A',
          soft: 'rgba(255, 113, 138, 0.12)',
          light: '#FF718A',
        },
        critical: {
          DEFAULT: '#FF718A',
          soft: 'rgba(255, 113, 138, 0.12)',
          light: '#FF718A',
        },
        safe: {
          DEFAULT: '#52D6B2',
          soft: 'rgba(82, 214, 178, 0.12)',
          light: '#52D6B2',
        },
        apptext: {
          primary: '#F4F5FF',
          secondary: '#A6AEC8',
          muted: '#727D9C',
          disabled: '#535C7A',
        },
        border: {
          DEFAULT: 'rgba(166, 174, 200, 0.14)',
          hover: 'rgba(139, 124, 255, 0.42)',
          strong: 'rgba(166, 174, 200, 0.25)',
        },

        // Legacy compatibility mappings redirecting into Midnight Aurora
        midnight: '#080B18',
        'secondary-navy': '#0D1224',
        'surface-elevated': '#1D2540',
        'electric-cyan': {
          DEFAULT: '#55D6E8',
          hover: '#7BE2F1',
          soft: 'rgba(85, 214, 232, 0.12)',
          glow: 'rgba(85, 214, 232, 0.20)',
        },
        'verification-teal': {
          DEFAULT: '#52D6B2',
          soft: 'rgba(82, 214, 178, 0.12)',
        },
        zcyan: {
          DEFAULT: '#8B7CFF',
          hover: '#A99BFF',
          glow: 'rgba(139, 124, 255, 0.24)',
          soft: 'rgba(139, 124, 255, 0.12)',
          border: 'rgba(139, 124, 255, 0.42)',
        },
        ztext: {
          white: '#F4F5FF',
          variant: '#A6AEC8',
          muted: '#727D9C',
          subtle: '#535C7A',
        },
      },
      fontFamily: {
        display: ['thunderLC', 'sans-serif'],
        headline: ['thunderHC', 'sans-serif'],
        script: ['Carattere', 'cursive'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'aurora-glow': '0 0 25px -5px rgba(139, 124, 255, 0.35)',
        'cyan-glow': '0 0 25px -5px rgba(85, 214, 232, 0.3)',
        'critical-glow': '0 0 25px -5px rgba(255, 113, 138, 0.28)',
        'card-aurora': 'rgba(8, 11, 24, 0.85) 0px 15px 35px 0px, rgba(139, 124, 255, 0.15) 0px 0px 25px 0px',
        'btn-aurora': 'rgba(8, 11, 24, 0.7) 0px 8px 24px 0px, rgba(139, 124, 255, 0.22) 0px 0px 16px 0px',
      },
      borderRadius: {
        'z-xs': '6px',
        'z-sm': '8px',
        'z-md': '13px',
        'z-lg': '14px',
        'z-xl': '20px',
      }
    },
  },
  plugins: [],
}
