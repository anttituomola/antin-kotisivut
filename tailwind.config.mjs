import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'background': '#3A3E2F',
        'surface': '#464B39',
        'primary': {
          DEFAULT: '#8AA399',
          hover: '#A1B5A0',
          dark: '#4A3F35',
        },
        'accent': {
          DEFAULT: '#2E3B30',
          hover: '#394739',
        },
        'text': {
          primary: '#E8E3DC',
          secondary: '#D1CEC5',
          muted: '#AFAFAF',
        },
        'status': {
          success: '#4B7154',
          warning: '#C8A15A',
          error: '#A45648',
        },
        'border': '#4A4F40',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: '#D1CEC5',
            a: {
              color: '#8AA399',
              '&:hover': {
                color: '#A1B5A0',
              },
            },
            h1: {
              color: '#E8E3DC',
            },
            h2: {
              color: '#E8E3DC',
            },
            h3: {
              color: '#E8E3DC',
            },
            h4: {
              color: '#E8E3DC',
            },
            strong: {
              color: '#E8E3DC',
            },
            code: {
              color: '#E8E3DC',
              backgroundColor: '#464B39',
            },
            blockquote: {
              color: '#D1CEC5',
              borderLeftColor: '#2E3B30',
            },
            table: {
              fontSize: '1rem',
              fontVariantNumeric: 'tabular-nums',
              borderCollapse: 'separate',
              borderSpacing: '0',
              border: '1px solid #5C6150',
              borderRadius: '0.75rem',
              overflow: 'hidden',
            },
            'thead': {
              backgroundColor: '#464B39',
              borderBottomColor: '#5C6150',
            },
            'thead th': {
              color: '#E8E3DC',
              fontWeight: '600',
              fontSize: '0.875rem',
              letterSpacing: '0.02em',
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
            },
            'thead th:first-child, tbody td:first-child': {
              paddingInlineStart: '1rem',
            },
            'thead th:last-child, tbody td:last-child': {
              paddingInlineEnd: '1rem',
            },
            'tbody tr': {
              borderBottomColor: '#4A4F40',
            },
            'tbody tr:nth-child(even)': {
              backgroundColor: 'rgba(70, 75, 57, 0.45)',
            },
            'tbody td': {
              paddingTop: '0.65rem',
              paddingBottom: '0.65rem',
            },
            'tbody td:last-child': {
              color: '#E8E3DC',
              fontWeight: '600',
            },
          },
        },
        // prose-lg resets the first/last cell padding to 0, so repeat it here
        lg: {
          css: {
            'thead th:first-child, tbody td:first-child': {
              paddingInlineStart: '1.25rem',
            },
            'thead th:last-child, tbody td:last-child': {
              paddingInlineEnd: '1.25rem',
            },
          },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
}