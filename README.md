# anttituomola.fi

Source for **[anttituomola.fi](https://www.anttituomola.fi/)** and a collection of small personal tools.

## Repository structure

This is a monorepo containing:

- **Website** — an Astro and MDX portfolio, CV and blog
- **docs/blog-ideapankki.example.md** — blog post idea bank template; copy to `docs/blog-ideapankki.local.md` (gitignored) and keep real ideas local only
- **Toolbox** — a Vite/React application for small personal utilities
- **Mailing list service** — an Express, SQLite and AWS SES service for blog subscriptions

The site is intentionally content-first. Astro handles static and server-rendered pages, while React is used only where interaction warrants it.

## Stack

- Astro 6
- MDX
- React
- TypeScript
- Tailwind CSS
- Express
- SQLite
- AWS SES
- Vercel

## Development

```bash
npm install
npm run dev
```

The website is available locally through Astro’s development server. Individual toolbox and backend commands are documented in their respective directories.

## Links

- [Live website](https://www.anttituomola.fi/)
- [GitHub profile](https://github.com/anttituomola)
- [LinkedIn](https://www.linkedin.com/in/anttituomola)
