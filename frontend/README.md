# Rescue Dog Aggregator (Frontend)

This is a Next.js + Tailwind CSS application that consumes the FastAPI backend  
(locally at `http://localhost:8000` by default, configurable via `NEXT_PUBLIC_API_URL`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

```
frontend/
├── src/
│   ├── app/           # Next.js App Router pages
│   │   ├── dogs/      # List + Detail pages for dogs
│   │   └── organizations/
│   ├── components/    # Shared UI (cards, form controls, SocialMediaLinks, etc.)
│   ├── services/      # API helper functions (animalsService, organizationsService)
│   └── utils/         # Helpers (formatters, etc.)
├── jest.config.js
├── jest.setup.js      # Next.js mocks for image/link/navigation
└── package.json
```

## Scripts

- `npm run dev` – Development server  
- `npm run build` – Build for production  
- `npm run start` – Start production build  
- `npm test` – Run all Jest tests  
- `npm run test:watch` – Watch mode

## Tests

- Component tests: `src/components/**/__tests__/*.test.jsx`  
- Page tests: `src/app/**/__tests__/*.test.jsx`  
- Service tests: `src/services/**/__tests__`  

Social media share tests have been added to verify the new `<SocialMediaLinks>` component  
and that both dog-detail and org-detail pages render share links correctly.

## Environment

Configure the backend API host with:

```bash
export NEXT_PUBLIC_API_URL="http://localhost:8000"
```

## Deployment

Recommended: push this directory to Vercel (it auto-detects Next.js).  
See the [Next.js deploying docs](https://nextjs.org/docs/deployment).
