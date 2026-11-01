# Panaji Community — MVP starter

A map-first, crowdsourced community incident reporting application for Panaji, Goa.

## Included in this starter

- Next.js + React + TypeScript frontend
- MapLibre map centered on Panaji
- Category filters and recent-report list
- Anonymous report form with description, locality, coordinates, and optional photo
- Supabase/PostgreSQL schema with PostGIS geography
- Server-side report submission route
- Public read access for pending and moderator-approved reports

## 1. Prerequisites

- Node.js 20.9 or newer
- npm
- A Supabase project
- VS Code (recommended)

## 2. Run locally

```bash
npm install
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Fill in the Supabase URL and anon key in `.env.local`. Add the service-role key only to the server-side `SUPABASE_SERVICE_ROLE_KEY` variable. Never put it in a `NEXT_PUBLIC_` variable or commit it to Git.

## 3. Create the database

1. Open your Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy the project URL, anon key, and service-role key into `.env.local`.

## 4. Start the application

```bash
npm run dev
```

Open http://localhost:3000.

## 5. Important MVP limitations

This is a development starter, not a production-ready public service.

Before opening submissions to the public:
- Implement Cloudflare Turnstile verification in `app/api/reports/route.ts`.
- Add a shared rate limiter (Upstash Redis or equivalent); serverless in-memory limits are not sufficient.
- Add server-side image re-encoding/metadata stripping and malware/content checks.
- Add an administrator login and moderation interface.
- Add duplicate-report detection and report expiration jobs.
- Add a map click-to-select location control and confirm the Panaji coverage polygon with local knowledge.
- Add a consent/privacy notice and a process for reporting/removing harmful or private content.
- Review OpenStreetMap tile usage policy. For significant traffic, use a compliant tile provider or self-hosted tiles rather than relying on the public OSM tile servers.
- Configure image retention, backups, monitoring, and abuse response procedures.

The map currently uses an approximate Panaji center and a broad coordinate validation box. That box is only a prototype guardrail, not an official municipal boundary. Replace it with a verified Panaji boundary polygon before launch.

## 6. Anonymous submissions and trust

No account is required in this prototype. Reports are inserted by a server-side route and marked `pending`. Pending reports are visible with an explicit pending label. This is a deliberate transparency choice; it does not mean they are verified. A production deployment should add anti-bot verification, rate limiting, moderation tools, and safe image handling before public launch.

## 7. Suggested next iteration

1. Interactive map-based location picker.
2. Report detail page with image and map.
3. Admin moderation dashboard.
4. Community confirm/dispute endpoint with privacy-preserving abuse controls.
5. Push notifications by locality and category.
6. English/Konkani/Marathi/Hindi localization when needed.
# panaji-community
