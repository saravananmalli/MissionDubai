/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Premium dark purple/magenta design system. Every value is read from
        // a CSS custom property (src/index.css :root) — this file only maps
        // Tailwind utility names onto that single source of truth. Solid
        // colors use the `rgb(var(--c-x) / <alpha-value>)` pattern so Tailwind
        // opacity modifiers (e.g. bg-surface/60) keep working.
        background: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
          2: 'rgb(var(--c-bg-2) / <alpha-value>)',
          3: 'rgb(var(--c-bg-3) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          2: 'rgb(var(--c-surface-2) / <alpha-value>)',
          elevated: 'rgb(var(--c-surface-elevated) / <alpha-value>)',
          'elevated-2': 'rgb(var(--c-surface-elevated-2) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light) / <alpha-value>)',
        },
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        error: 'rgb(var(--c-error) / <alpha-value>)',
        border: {
          DEFAULT: 'var(--color-border)',
          active: 'var(--color-border-active)',
        },
        glow: 'var(--color-glow)',
        text: {
          primary: 'rgb(var(--c-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--c-text-muted) / <alpha-value>)',
        },

        // Legacy token names kept so every existing `ink-*`/`cream-*`/`gold`/
        // `terracotta-*`/`honey-*`/`sage-*` class in the app resolves to the
        // new dark palette above without a full rename — see claude.md plan
        // "assume-you-are-a-replicated-bentley" for the mapping rationale.
        // `ink` was the darkest-text-on-light scale; on a dark background the
        // scale is inverted (its high numbers must render as light text).
        ink: {
          50: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          100: 'var(--color-border)',
          200: 'var(--color-border)',
          300: 'rgb(var(--c-text-muted) / <alpha-value>)',
          400: 'rgb(var(--c-text-muted) / <alpha-value>)',
          500: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          600: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          700: 'rgb(var(--c-text-primary) / <alpha-value>)',
          800: 'rgb(var(--c-text-primary) / <alpha-value>)',
          900: 'rgb(var(--c-text-primary) / <alpha-value>)',
        },
        cream: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
          100: 'rgb(var(--c-surface) / <alpha-value>)',
          200: 'rgb(var(--c-surface-2) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light) / <alpha-value>)',
          dark: '#D72BC8',
        },
        taupe: {
          DEFAULT: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          light: 'rgb(var(--c-text-muted) / <alpha-value>)',
        },
        terracotta: {
          DEFAULT: '#7A2E3D',
          light: '#2E1420',
          dark: 'rgb(var(--c-error) / <alpha-value>)',
        },
        honey: {
          DEFAULT: '#8A5F2A',
          light: '#2E210F',
          dark: 'rgb(var(--c-warning) / <alpha-value>)',
        },
        sage: {
          DEFAULT: '#2E7A5C',
          light: '#0F2A20',
          dark: 'rgb(var(--c-success) / <alpha-value>)',
        },
      },
      fontFamily: {
        // The reference design uses one bold geometric sans throughout, no
        // serif — remap rather than touch every `font-serif` call-site.
        serif: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '14px',
        md: '18px',
        lg: '22px',
        xl: '24px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        primary: 'var(--shadow-primary)',
      },
      backgroundImage: {
        cta: 'var(--gradient-cta)',
      },
    },
  },
  plugins: [],
};
