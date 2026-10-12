# PrimeWave Resource Reservation Management System

A centralized, conflict-free web application designed to manage facilities, studio gear, and vehicles. Built with **Next.js (App Router)**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and **Tailwind CSS**.

---

## 🌟 Key Features

1. **Conflict-Free Reservation Engine**:
   - Zero double-bookings guaranteed at the database level using PostgreSQL `btree_gist` **Exclusion Constraints**.
   - Handles concurrent requests and race conditions atomically.
   - Graceful 409 Conflict handling with human-readable error messages specifying the conflicting party and time slot.
2. **Interactive Availability Matrix (`/availability`)**:
   - Visual timeline row per resource covering business hours (**08:00 – 20:00**).
   - Real-time booked vs. available visual slots.
   - **Click-to-book**: Clicking an available slot opens a prefilled reservation dialog with the exact resource and time range.
3. **Master Reservation Registry (`/reservations`)**:
   - Filter by resource, status (`CONFIRMED`, `CANCELLED`), date range, or search by booker and purpose.
   - Edit reservations with re-evaluated overlap checks (excluding self).
   - Cancel bookings with confirmation dialog, which immediately frees the slot for other team members.
4. **Resource Catalog & Utilization (`/resources`)**:
   - Categorized by `ROOM`, `EQUIPMENT`, and `VEHICLE`.
   - Real-time utilization rate calculation and progress bars based on weekly hours booked.
   - Safe deletion prevention: resources with future active reservations cannot be deleted (offers deactivation instead).
5. **Operational Dashboard (`/`)**:
   - Overview metrics: Total resources, active facilities, bookings today, weekly utilization.
   - Real-time lists of today's schedule and upcoming confirmed bookings.
6. **Polished UX & Accessibility**:
   - PrimeWave curated teal & slate brand aesthetic.
   - Dark mode toggle with persistent local storage.
   - Inline Zod validation feedback and floating toast notifications.
   - AbortController cancellation on Client Components to avoid stale fetches.

---

## 🏗️ Architecture & Database Design

### Why the Database Exclusion Constraint?
In typical web apps, reservation overlap is checked with an application query (`SELECT ... WHERE start < new_end AND end > new_start`). Under concurrent traffic or distributed servers, two users can submit the same slot simultaneously, both read empty results, and both insert conflicting bookings.

To solve this fundamentally:
1. We enable the PostgreSQL extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```
2. We declare a GiST exclusion constraint on the `reservations` table:
   ```sql
   ALTER TABLE "reservations"
   ADD CONSTRAINT "no_overlapping_confirmed_reservations"
   EXCLUDE USING gist (
     "resource_id" WITH =,
     tstzrange("start_time", "end_time", '[)') WITH &&
   )
   WHERE ("status" = 'CONFIRMED');
   ```
3. A `CHECK ("end_time" > "start_time")` constraint guarantees valid intervals.
4. When Postgres detects an overlap, it throws error code `23P01`. Our API service catches `23P01` and returns HTTP `409 CONFLICT` with a descriptive error message.
5. The partial clause `WHERE (status = 'CONFIRMED')` allows cancelled reservations to remain in the database for audit trails without blocking new bookings.

See [ER Diagram & Constraint Specification](docs/ER_DIAGRAM.md) for full details.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components + Client Components)
- **Language**: TypeScript (Strict mode)
- **ORM & Database**: Prisma ORM 6.4 + PostgreSQL 16
- **Styling**: Tailwind CSS + PrimeWave custom token system
- **Icons**: Lucide React
- **Validation**: Zod (shared schemas in `lib/validation.ts`)
- **Date Utilities**: Date-fns (handles timezone parsing and range formatting)
- **Testing**: Vitest (unit tests for interval overlap and business schemas)

---

## 🚀 Setup & Local Running

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- Docker Desktop (or local PostgreSQL 14+ instance)

### Single Setup Flow

1. **Clone & install dependencies**:
   ```bash
   npm install
   ```

2. **Start PostgreSQL via Docker Compose**:
   ```bash
   docker compose up -d
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   *(Default connection string is pre-configured for `postgresql://postgres:postgrespassword@localhost:5432/resource_hub?schema=public`)*

4. **Run Database Migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed Demo Data**:
   ```bash
   npm run db:seed
   ```

6. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Start Next.js development server |
| `npm run build` | `next build` | Create production bundle |
| `npm run start` | `next start` | Run production server |
| `npm run db:migrate` | `prisma migrate deploy` | Apply pending PostgreSQL migrations including constraints |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seed 6 realistic resources & 15 bookings |
| `npm run db:reset` | `prisma migrate reset --force` | Drop, re-migrate, and re-seed the database |
| `npm test` | `vitest run` | Run test suite for overlap logic & Zod schemas |

---

## 🌐 API Endpoint Reference

All endpoints return uniform JSON responses: `{ data: ... }` on success or `{ error: { code, message, details } }` on failure.

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/resources?stats=true` | List all resources with usage metrics & utilization rates | `200` |
| `POST` | `/api/resources` | Create a new resource | `201`, `400`, `409` |
| `GET` | `/api/resources/:id` | Get resource details and reservation history | `200`, `404` |
| `PATCH` | `/api/resources/:id` | Update resource attributes or toggle active status | `200`, `400`, `404` |
| `DELETE` | `/api/resources/:id` | Delete resource (blocked if future bookings exist) | `200`, `400`, `404` |
| `GET` | `/api/reservations` | List reservations with search, resource, and status filters | `200` |
| `POST` | `/api/reservations` | Create reservation with concurrency-safe overlap check | `201`, `400`, `409` |
| `GET` | `/api/reservations/:id` | Get reservation by ID | `200`, `404` |
| `PATCH` | `/api/reservations/:id` | Modify reservation time or booker (re-checks overlap) | `200`, `400`, `409` |
| `DELETE` | `/api/reservations/:id` | Cancel reservation (releases slot) | `200`, `404` |
| `GET` | `/api/availability?date=YYYY-MM-DD` | Hourly timeline availability slots (08:00 - 20:00) | `200`, `400` |
| `GET` | `/api/stats` | Dashboard statistics (totals, weekly utilization, today's list) | `200` |

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── availability/route.ts
│   │   ├── reservations/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── resources/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── stats/route.ts
│   ├── availability/page.tsx
│   ├── reservations/page.tsx
│   ├── resources/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── reservation-dialog.tsx
│   ├── resource-dialog.tsx
│   ├── sidebar.tsx
│   ├── theme-provider.tsx
│   └── toast.tsx
├── docs/
│   └── ER_DIAGRAM.md
├── lib/
│   ├── api-error.ts
│   ├── availability-service.ts
│   ├── prisma.ts
│   ├── reservation-service.ts
│   ├── resource-service.ts
│   ├── types.ts
│   ├── utils.ts
│   └── validation.ts
├── prisma/
│   ├── migrations/
│   │   └── 20261012000000_init/
│   │       └── migration.sql
│   ├── schema.prisma
│   └── seed.ts
├── tests/
│   └── reservation.test.ts
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## 🔮 Future Improvements

1. **Email / Slack Notifications**: Automated confirmation emails with calendar invitations (`.ics` files) upon booking approval.
2. **Recurring Bookings**: Support for daily/weekly repeating reservation series with batch overlap resolution.
3. **Role-Based Access Control (RBAC)**: Distinct permissions for standard employees vs. facility admins (admin approval for high-demand equipment).
4. **Hardware Check-In / QR Scanning**: Physical QR code check-in on room tablets and equipment kits to auto-release no-shows after 15 minutes.
