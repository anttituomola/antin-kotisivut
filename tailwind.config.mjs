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
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}