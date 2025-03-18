# Antti Tuomola's Website & Toolbox

This repository contains two main projects:

1. **Personal Website** - The main website at [anttituomola.fi](https://anttituomola.fi)
2. **Toolbox** - A collection of personal tools at [toolbox.anttituomola.fi](https://toolbox.anttituomola.fi)

## Project Structure

This is a monorepo containing:

```
antin-kotisivut/
├── apps/
│   ├── website/        # Personal website (Astro)
│   └── toolbox/        # Toolbox application (Vite/React)
│       └── api/        # Toolbox backend API (Express)
│
└── packages/           # Shared packages and components
```

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - Create `.env` files based on `.env.example` files

### Running the Website

```bash
npm run dev
```

### Running the Toolbox

To run just the frontend:
```bash
npm run toolbox:dev
```

To run just the API backend:
```bash
npm run toolbox:api
```

To run both simultaneously:
```bash
npm run toolbox:dev:all
```

## Deployment

The projects are deployed on Vercel:

1. Website: Deployed at `anttituomola.fi`
2. Toolbox Frontend: Deployed at `toolbox.anttituomola.fi`
3. Toolbox API: Deploy separately as a Node.js service

My personal internet space

TODO:
- mailing list!