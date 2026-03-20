/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Mount Meru Official Brand Colors ──────────────────
        primary: {
          DEFAULT: '#D1111C',   // Meru Red (PANTONE P 48-16 C)
          hover:   '#B50E17',   // Darker red on hover
          light:   '#F8D7DA',   // Light red tint
          50:      '#FFF0F0',
          100:     '#FFD7D9',
          200:     '#FFB0B4',
          300:     '#FF8086',
          400:     '#F54550',
          500:     '#D1111C',   // Main
          600:     '#B50E17',
          700:     '#8F0B12',
          800:     '#6B080D',
          900:     '#470509',
        },
        secondary: {
          DEFAULT: '#FFCC00',   // Meru Yellow (PANTONE P 7-8 C)
          hover:   '#E6B800',
          light:   '#FFF8D6',
          50:      '#FFFDE7',
          100:     '#FFF9C4',
          200:     '#FFF176',
          300:     '#FFE500',
          400:     '#FFCC00',   // Main
          500:     '#E6B800',
          600:     '#CC9900',
          700:     '#997300',
          800:     '#664D00',
          900:     '#332600',
        },
        // ── Sidebar ───────────────────────────────────────────
        sidebar: {
          DEFAULT: '#181410',   // Official dark brown-black
          hover:   '#231E19',
          active:  'rgba(209,17,28,0.18)',
          border:  'rgba(255,255,255,0.08)',
        },
        // ── Neutral / UI ──────────────────────────────────────
        surface: {
          DEFAULT: '#FFFFFF',
          subtle:  '#F7F7F7',   // Official background
          muted:   '#F0F0F0',
        },
        // Status colors
        status: {
          draft:       '#6B7280',
          active:      '#10B981',
          inprogress:  '#3B82F6',
          completed:   '#22C55E',
          delayed:     '#EF4444',
          onhold:      '#F59E0B',
          cancelled:   '#9CA3AF',
          void:        '#DC2626',
          approved:    '#16A34A',
          pending:     '#D97706',
          rejected:    '#DC2626',
        },
      },
      // ── Typography ─────────────────────────────────────────
      fontFamily: {
        sans:    ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Brand-spec sizes
        'display': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1':      ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        'h2':      ['20px', { lineHeight: '1.3',  fontWeight: '600' }],
        'h3':      ['18px', { lineHeight: '1.4',  fontWeight: '600' }],
        'body':    ['14px', { lineHeight: '1.5',  fontWeight: '400' }],
        'sm':      ['12px', { lineHeight: '1.5',  fontWeight: '400' }],
      },
      spacing: {
        // 4px grid system
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '8':  '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
      },
      borderRadius: {
        'sm':  '6px',
        DEFAULT: '8px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'sm':    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card':  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10)',
        'modal': '0 20px 60px -12px rgba(0,0,0,0.28)',
        'sidebar': '2px 0 12px 0 rgb(0 0 0 / 0.15)',
        'primary': '0 4px 14px 0 rgba(209,17,28,0.30)',
        'secondary': '0 4px 14px 0 rgba(255,204,0,0.35)',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'slide-in':  'slideIn 0.25s ease-out',
        'slide-right': 'slideRight 0.25s ease-out',
        'scale-in':  'scaleIn 0.2s ease-out',
        'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:   { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideRight:{ from: { opacity: '0', transform: 'translateX(8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseRed:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '.5' } },
      },
    },
  },
  plugins: [],
};
