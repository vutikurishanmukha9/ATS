/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--color-canvas)',
          alt: 'var(--color-canvas-alt)',
        },
        alt: 'var(--color-canvas-alt)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
          raised: 'var(--color-surface-raised)',
        },
        raised: 'var(--color-surface-raised)',
        input: 'var(--color-input)',
        overlay: 'var(--color-overlay)',
        ink: {
          DEFAULT: 'var(--color-ink)',
          muted: 'var(--color-muted)',
          subtle: 'var(--color-subtle)',
        },
        muted: 'var(--color-muted)',
        subtle: 'var(--color-subtle)',
        hairline: {
          DEFAULT: 'var(--color-hairline)',
          strong: 'var(--color-hairline-strong)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          active: 'var(--color-accent-active)',
          subtle: 'var(--color-accent-subtle)',
        },
        focus: 'var(--color-focus-ring)',
        semantic: {
          success: 'var(--color-status-success)',
          'success-bg': 'var(--color-status-success-bg)',
          warning: 'var(--color-status-warning)',
          'warning-bg': 'var(--color-status-warning-bg)',
          danger: 'var(--color-status-danger)',
          'danger-bg': 'var(--color-status-danger-bg)',
        },
        stage: {
          applied: {
            bg: 'var(--color-stage-applied-bg)',
            text: 'var(--color-stage-applied-text)',
          },
          screening: {
            bg: 'var(--color-stage-screening-bg)',
            text: 'var(--color-stage-screening-text)',
          },
          interview: {
            bg: 'var(--color-stage-interview-bg)',
            text: 'var(--color-stage-interview-text)',
          },
          technical: {
            bg: 'var(--color-stage-technical-bg)',
            text: 'var(--color-stage-technical-text)',
          },
          offer: {
            bg: 'var(--color-stage-offer-bg)',
            text: 'var(--color-stage-offer-text)',
          },
          hired: {
            bg: 'var(--color-stage-hired-bg)',
            text: 'var(--color-stage-hired-text)',
          },
          rejected: {
            bg: 'var(--color-stage-rejected-bg)',
            text: 'var(--color-stage-rejected-text)',
          },
        },
      },
      borderRadius: {
        none: '0px',
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        subtle: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        ambient: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        popover: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      transitionDuration: {
        DEFAULT: '150ms',
        fast: '150ms',
        settle: '200ms',
      },
    },
  },
  plugins: [],
}
