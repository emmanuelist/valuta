/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground:   '#F7F8F9',
        surface:  '#FFFFFF',
        claim:    '#F9FBFC',
        ink:      '#0F1720',
        secondary:'#5B6470',
        rules:    '#E3E6EA',
        petrol:   '#0B4F6C',
        ptint:    '#E6F0F4',
        vermilion:'#D93F2B',
        amber:    '#B7791F',
      },
      fontFamily: {
        sans: ['"Radio Canada Big"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card:   '12px',
        btn:    '8px',
        tag:    '6px',
      },
      fontSize: {
        '47': ['47px', { lineHeight: '1.1' }],
        '37': ['37px', { lineHeight: '1.1', fontVariantNumeric: 'tabular-nums' }],
        '34': ['34px', { lineHeight: '1.1' }],
        '27': ['27px', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}
