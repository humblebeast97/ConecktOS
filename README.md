# ConecktOS

**The operating system for service businesses.**

ConecktOS is a mobile-first Progressive Web App that digitizes the day-to-day running of small and medium service businesses — salons and barbershops, car washes, tailoring and fashion houses, lounges and nightclubs, and electronics repair shops. It replaces the manual notebooks, WhatsApp threads, and mental math with one clean system for staff attendance, commissions, inventory, tipping, expenses, and end-of-day reconciliation.

Built for African SMEs first (Naira-native, geofenced clock-ins, generator/fuel tracking), it eliminates the financial leakage that comes from untracked cash, unrecorded commissions, and quietly disappearing stock.

---

## Why ConecktOS

Owners of service businesses lose money in the gaps: staff who clock in late (or not at all), commissions calculated by hand, tips that never make it past the customer's awkwardness, inventory used without a matching sale, and a cash drawer that never quite balances at close.

ConecktOS closes those gaps:

- **Know who actually showed up** — GPS-verified clock-ins, not honour-system sign-in sheets.
- **Pay commissions correctly** — split automatically off each service, per staff rate.
- **Capture every tip** — a personal QR code the customer just scans.
- **Stop stock walking out** — consumables deduct against real tickets, and unmatched usage is flagged.
- **Balance the day in one tap** — a fraud-aware end-of-day audit you can print or save as PDF.

---

## One product, many industries

ConecktOS adapts its language, colours, and modules to the business it's running. Pick a category on setup and the whole app re-skins itself:

| Sub-brand | Industry | Accent |
|---|---|---|
| **GroomConeckt** | Salons & barbershops | Gold |
| **WashConeckt** | Car wash & detailing | Blue |
| **StitchConeckt** | Tailoring & fashion houses | Violet |
| **NightConeckt** | Lounges & nightclubs | Rose |
| **FixConeckt** | Electronics repair plazas | Amber |
| **ConecktOS** | Platform / landing / global | Sky |

Labels change with the industry too — a "stylist" becomes a "washer", "detailer", "tailor", "bartender", or "technician"; "consumables" become "chemicals", "fabrics", or "spare parts".

---

## Roles

ConecktOS is multi-tenant and role-aware. Each business is isolated, and each person sees only what their role needs.

- **Owner / Admin** — full visibility: revenue analytics, commissions payable, generator/fuel costs, inventory levels, attendance, and the end-of-day audit.
- **Front desk / Receptionist** — opens service tickets, matches POS/transfer payments, tracks who's clocked in, and logs inventory usage.
- **Staff / Stylist** — a mobile-first portal to clock in by GPS, watch today's commission add up in real time, review service history, and display a personal tip QR.

---

## Core features

### Geofenced clock-in
Staff clock in from their phone. ConecktOS reads the device's GPS and measures the distance to the shop using the Haversine formula. Inside the geofence radius → verified. Outside → recorded and flagged on the owner's dashboard.

### Automatic commission split
Front desk opens a ticket, adds services, and assigns a staff member to each. ConecktOS calculates each split automatically (`service price × staff commission rate`) — no arithmetic, no arguments.

### Personal tip QR
Every staff member gets a unique QR code linked to their tip destination. Stick it on the mirror, the wristband, the counter — the customer scans and tips. No asking, no awkwardness. Includes a printable mirror-card layout.

### Auto-deduct inventory
Track consumables with reorder thresholds. Linking a service to its consumables (e.g. hair dye, chemicals, spare screens) deducts stock when the ticket is billed. Low-stock items surface in red on the owner dashboard.

### Generator & expense logging
Log fuel, maintenance, rent, and supplies. ConecktOS computes generator overhead per billed service, so owners see the true cost behind each job.

### End-of-day audit
A single **Close Day & Audit** flow reconciles the day — gross revenue by method (POS / transfer / cash), commissions payable, expenses, generator overhead, and anti-fraud checks (stock used with no matching ticket). Pick any date, review, then print or save as PDF.

### Installable PWA
Add to home screen on phone, tablet, or desktop. Ships a web app manifest, maskable icons, a service worker with offline fallback, and a responsive layout that works from a 375px phone up to a reception tablet and desktop.

---

## Screens

- `/` — sign in (role selector + credentials)
- `/signup` — owner sign-up with guided business setup
- `/join` — team sign-up (front desk & floor staff)
- `/staff` — staff portal: clock-in status, live earnings, tip QR, history
- `/reception` — front desk: quick billing, open tickets, clocked-in staff
- `/team` — team & HR onboarding and roster
- `/admin` — owner dashboard: revenue, attendance, inventory, expenses, audit

---

## Tech stack

- **Framework:** TanStack Start (React 19) with file-based routing and SSR
- **Styling:** Tailwind CSS v4 + shadcn/ui, dark luxury theme with per-industry accents
- **Icons:** Lucide
- **Data & charts:** TanStack Query, Recharts
- **Backend:** Supabase (PostgreSQL) with Row-Level Security isolating data by business
- **Auth:** Supabase Auth (email / password, role-based)
- **Build/deploy:** Vite + Nitro, deployable to Cloudflare
- **PWA:** web manifest + service worker (offline shell)

---

## Getting started

Requires Node.js 20+.

```bash
# install dependencies
npm install

# copy the environment template and fill in your Supabase values
cp .env.example .env

# start the dev server (http://localhost:8080)
npm run dev
```

Other scripts:

```bash
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # lint
npm run format    # prettier
```

### Environment variables

Set these in `.env` (never committed) or in your deploy platform:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (client-safe) key |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |

See `.env.example` for the full list.

---

## Project structure

```
src/
  routes/           # pages: index, signup, join, staff, reception, team, admin
  components/        # app shell, panels (inventory, services, team), UI primitives
  config/            # industry configs + theming context
  integrations/      # Supabase client, auth middleware
  lib/               # domain model, store, reports/audit logic
public/              # manifest, icons, service worker, offline page, share image
supabase/migrations/ # database schema
```

---

## Status

ConecktOS is under active development. The full multi-industry UI, theming, PWA, and end-of-day audit are in place. The data layer is being migrated onto Supabase with per-business Row-Level Security; some dashboards currently run on seeded sample data while that lands.

---

## License

Proprietary — © ConecktOS. All rights reserved.
