# Event Attendance System

A modern, full-stack Event Attendance System built with Next.js 15, featuring role-based authentication, QR code-based attendance tracking, and comprehensive management capabilities for educational institutions.

## Features

## Prerequisites

- **Node.js**: 18+ ([Download](https://nodejs.org/))
- **PostgreSQL**: 12+ ([Download](https://www.postgresql.org/download/))

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router + Server Actions)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Theming**: next-themes (Light/Dark/System modes)
- **Database**: PostgreSQL + Prisma ORM 6.16.3
- **Authentication**: Custom JWT with bcryptjs, jose 6.1.0
- **Forms**: React Hook Form 7.64.0 + Zod 4.1.11 validation
- **Rate Limiting**: Upstash Redis
- **UI Components**: shadcn/ui (Dialog, Input, Button, Select, etc.)
- **Charts**: Recharts 2.15.4 (analytics visualizations)
- **Data Tables**: TanStack Table 8+ (headless table logic)
- **Export**: xlsx (SheetJS) for Excel export, custom CSV generator
- **Storage**: Cloudinary for photos/signatures

## Getting Started

### Environment setup

This project reads settings from [.env](.env). For local development without external services, you can keep only the required fields and leave optional services blank or unchanged.

**Required for local development**

- `DATABASE_URL`: point to your local PostgreSQL instance.
- `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`: keep as-is or regenerate.
- `NEXT_PUBLIC_APP_URL`: set to `https://localhost:3000` for local HTTPS.
- `NODE_ENV`: use `development`.

**Optional services (safe to disable locally)**

- **Cloudflare R2** (`CLOUDFLARE_*`)
- **Cloudinary** (`CLOUDINARY_*`)
- **Upstash Redis** (`KV_*`, `REDIS_URL`)
- **Mapbox** (`NEXT_PUBLIC_MAPBOX_TOKEN`)
- **AI services** (`PERPLEXITY_API_KEY`, `CONTEXT7_API_KEY`)
- **Supabase production database** (`POSTGRES_*`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_*`)

If you are deploying online, replace any local-only values with production credentials. This is optional for local development, but required for production deployments.

### Install dependencies

1. Install Node.js dependencies:
	 - `npm install`

### Database setup (local PostgreSQL)

1. Create a local database (example name from [.env](.env)): `event_attendance`.
2. Ensure `DATABASE_URL` points to your local database.
3. Run Prisma migrations and generate the client:
	 - `npx prisma migrate dev`
	 - `npx prisma generate`

### Run the app locally

This project includes an HTTPS dev server helper. Use one of the options below:

- **HTTP dev server**
	- `npm run dev`

- **HTTPS dev server** (recommended when testing PWA or camera access)
	- `node scripts/dev-https-server.js`

Then open `https://localhost:3000` in your browser.

### Optional: seed data

Seed scripts are available under [prisma/](prisma/). Use them only if needed for local testing.

### API endpoints and actions

See [API_ENDPOINTS.md](API_ENDPOINTS.md) for the list of API routes and server actions.

## Project Structure

---

### Summary

- `src/app`: Next.js App Router pages, layouts, and API routes.
- `src/actions`: Server Actions grouped by domain (auth, events, attendance, etc.).
- `src/components`: UI and feature components (dashboard, attendance, auth, profile).
- `src/hooks`: Reusable React hooks (auth, camera, geolocation, PWA).
- `src/lib`: Core business logic, utilities, validations, and integrations.
- `src/assets`: Static assets bundled with the app.
- `public`: Static public files (PWA assets, images, videos).
- `prisma`: Prisma schema and seed scripts.
- `scripts`: Dev/ops scripts (HTTPS dev server, PWA icons, maintenance).

### Project Tree

```text
├── .gitignore                        # Git ignore rules
├── .prettierignore                   # Prettier ignore rules
├── CHANGELOG.md                      # Release notes
├── LICENSE                           # License information
├── README.md                         # Project documentation
├── components.json                   # shadcn/ui config
├── eslint.config.mjs                 # ESLint configuration
├── next-env.d.ts                     # Next.js type declarations
├── next.config.ts                    # Next.js configuration
├── package-lock.json                 # NPM lockfile
├── package.json                      # Scripts and dependencies
├── postcss.config.mjs                # PostCSS configuration
├── prisma                            # Prisma schema and seeds
│   ├── schema.prisma                  # Database schema
│   ├── seed-pilot-testing-2.ts        # Seed script (variant 2)
│   ├── seed-pilot-testing.ts          # Seed script (variant 1)
│   └── student_name.txt               # Seed data list
├── public                            # Static public assets
│   ├── images                         # Public images
│   │   ├── USC-Logo.png               # Logo asset
│   │   ├── icons                       # PWA icons
│   │   └── logo.svg                   # SVG logo
│   ├── manifest.json                  # PWA manifest
│   ├── robots.txt                     # Robots directives
│   ├── sitemap.txt                    # Sitemap for crawlers
│   ├── sw.js                          # Service worker
│   └── videos                         # Public videos
│       └── animated_background.mp4    # Background video
├── scripts                           # Dev/ops helper scripts
│   ├── clear-production-data.ts       # Cleanup script
│   ├── copy-standalone.js             # Standalone build helper
│   ├── dev-https-server.js            # Local HTTPS server
│   ├── generate-pwa-icons.js          # PWA icon generator
│   ├── preview-https-server.js        # HTTPS preview server
│   └── start-perplexity.js            # AI helper bootstrap
├── src                               # Application source
│   ├── actions                        # Server Actions
│   │   ├── admin                       # Admin actions
│   │   ├── attendance                  # Attendance actions
│   │   ├── auth                        # Auth actions
│   │   ├── dashboard                   # Dashboard actions
│   │   ├── events                      # Event actions
│   │   ├── export                      # Export actions
│   │   ├── moderator                   # Moderator actions
│   │   └── profile                     # Profile actions
│   ├── app                            # App Router routes
│   │   ├── api                         # API route handlers
│   │   ├── attendance                  # Attendance pages
│   │   ├── auth                        # Auth pages
│   │   ├── dashboard                   # Role dashboards
│   │   ├── favicon.ico                 # App icon
│   │   ├── globals.css                 # Global styles
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Landing page
│   │   ├── pages-index                 # Index page group
│   │   ├── profile                     # Profile pages
│   │   └── updates                     # Updates page
│   ├── assets                         # Bundled assets
│   │   ├── icons                       # App icons
│   │   └── images                      # App images
│   ├── components                     # UI/feature components
│   │   ├── attendance                  # Attendance components
│   │   ├── auth                        # Auth components
│   │   ├── changelog-display.tsx       # Changelog UI
│   │   ├── conditional-footer.tsx      # Footer wrapper
│   │   ├── dashboard                   # Dashboard components
│   │   ├── error-boundary.tsx          # Error boundary
│   │   ├── events                      # Event components
│   │   ├── footer.tsx                  # Footer
│   │   ├── form-field-wrapper.tsx      # Form wrapper
│   │   ├── loading-skeletons.tsx       # Skeleton loaders
│   │   ├── logo.tsx                    # Logo component
│   │   ├── navigation.tsx              # Navigation bar
│   │   ├── profile                     # Profile components
│   │   ├── pwa-install-prompt.tsx      # PWA install UI
│   │   ├── pwa-provider.tsx            # PWA provider
│   │   ├── pwa-update-prompt.tsx       # PWA update UI
│   │   ├── step-card.tsx               # Step card UI
│   │   ├── theme-provider.tsx          # Theme provider
│   │   ├── theme-toggle.tsx            # Theme toggle
│   │   └── ui                          # shadcn/ui components
│   ├── hooks                          # Custom React hooks
│   │   ├── use-academic-programs.ts    # Academic programs hook
│   │   ├── use-auth.tsx                # Auth state hook
│   │   ├── use-camera.ts               # Camera hook
│   │   ├── use-geolocation.ts          # Location hook
│   │   ├── use-mobile.ts               # Mobile detection
│   │   ├── use-online.ts               # Online status
│   │   ├── use-print-qr-code.ts        # QR print helper
│   │   ├── use-pwa-install.tsx         # PWA install hook
│   │   ├── use-service-worker.ts       # SW helper
│   │   └── use-toast.ts                # Toast helper
│   ├── lib                            # Business logic/utils
│   │   ├── analytics                   # Analytics helpers
│   │   ├── auth                        # Auth utilities
│   │   ├── cache.ts                    # Cache helpers
│   │   ├── changelog-parser.ts         # Changelog parser
│   │   ├── chart-colors.ts             # Chart color map
│   │   ├── cloudflare-r2.ts            # R2 integration
│   │   ├── cloudinary.ts               # Cloudinary integration
│   │   ├── data                        # Static data
│   │   ├── db.ts                       # Prisma client
│   │   ├── events                      # Event utilities
│   │   ├── export                      # Export utilities
│   │   ├── geolocation.ts              # Geolocation utils
│   │   ├── qr-generator.ts             # QR generation
│   │   ├── rate-limit.ts               # Rate limiting
│   │   ├── security                    # Security helpers
│   │   ├── types                       # Shared types
│   │   ├── url-shortener.ts            # URL shortener
│   │   ├── utils                       # Utility helpers
│   │   ├── utils.ts                    # General utilities
│   │   └── validations                 # Zod schemas
│   └── middleware.ts                   # Next.js middleware
├── tsconfig.json                      # TypeScript config
├── tsconfig.tsbuildinfo               # TS build cache
└── vercel.json                        # Vercel deployment config
```

## Security Features

## Accessibility

This application meets WCAG 2.1 Level AA standards:

- ♿ Semantic HTML with ARIA labels
- ⌨️ Full keyboard navigation support
- 👆 Minimum 44×44px touch targets
- 🎨 4.5:1 color contrast ratios
- 📱 Screen reader compatible
- 🔍 Focus indicators for all interactive elements

## Performance

- ⚡ First Contentful Paint (FCP) <1.8s on 3G
- 📊 Lighthouse performance score ≥90
- 🖼️ Optimized images (WebP, responsive sizes)
- 📦 Code splitting by route
- 🚀 Server Components for zero-JS landing pages

## License

See [LICENSE](./LICENSE) file for details.

## Contributing

This is a private educational project. For questions or contributions, please contact the project maintainers.
