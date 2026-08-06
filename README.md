# Salon Suite Pro

Act as a Principal Full-Stack Software Engineer. Build a mobile-first, responsive Progressive Web App (PWA) called "GroomPulse" — a multi-tenant Salon Operating System built specifically for barbershops, hair salons, and nail bars in Nigeria.

### TECH STACK & DESIGN SYSTEM

- Frontend: React / Next.js with Tailwind CSS, Lucide Icons, and shadcn/ui components.

- Mobile-First PWA: Ensure full responsiveness across screens (mobile, 8-inch Android reception tablet, desktop) and configure a web app manifest for "Add to Home Screen".

- Backend & Database: Supabase (PostgreSQL) with Row-Level Security (RLS) enabled on all tables so multi-tenant salon data is strictly isolated by `salon_id`.

- Design Aesthetic: Dark/Sleek luxury theme (Slate/Zinc palette with Gold or Emerald accents), clean typography, bold touch-friendly buttons, and high-contrast tables.

---

### ROLE-BASED ACCESS CONTROL (3 ROLES)

1. OWNER / ADMIN ROLE:

   - Full access to business revenue analytics, staff commission reports, generator/fuel costs, inventory levels, and audit logs.

2. RECEPTIONIST / FRONT DESK ROLE:

   - Access to create service tickets, match POS/bank transfer receipts, track staff clock-ins, and manage daily inventory usages.

3. STAFF / STYLIST ROLE:

   - Mobile-only dashboard to clock in via GPS, view real-time personal daily commissions, see service history, and generate their unique personal QR tipping card.

---

### DATABASE SCHEMA (SUPABASE)

Create the following tables with Row-Level Security (RLS) enforcing `salon_id` isolation:

1. `salons`: id (uuid, PK), name (text), latitude (float), longitude (float), geofence_radius_meters (int, default 50), owner_id (uuid), created_at (timestamp).

2. `profiles`: id (uuid, PK, references auth.users), salon_id (uuid, FK), full_name (text), role (enum: 'owner', 'receptionist', 'staff'), commission_rate (numeric, default 0.50), paystack_subaccount_code (text, nullable), avatar_url (text).

3. `attendance`: id (uuid, PK), staff_id (uuid, FK), clock_in_time (timestamp), clock_out_time (timestamp, nullable), clock_in_lat (float), clock_in_lng (float), is_within_geofence (boolean), status (enum: 'on_time', 'late', 'absent').

4. `services`: id (uuid, PK), salon_id (uuid, FK), name (text), price (numeric), duration_minutes (int).

5. `inventory`: id (uuid, PK), salon_id (uuid, FK), item_name (text), quantity (numeric), unit (text, e.g., 'bottles', 'packs'), reorder_level (numeric).

6. `tickets`: id (uuid, PK), salon_id (uuid, FK), client_name (text), client_phone (text), total_amount (numeric), payment_method (enum: 'pos', 'bank_transfer', 'cash'), status (enum: 'pending', 'paid'), created_by (uuid, FK), created_at (timestamp).

7. `ticket_items`: id (uuid, PK), ticket_id (uuid, FK), service_id (uuid, FK), staff_id (uuid, FK), service_price (numeric), staff_commission_amount (numeric).

8. `ticket_inventory_usage`: id (uuid, PK), ticket_id (uuid, FK), inventory_id (uuid, FK), quantity_used (numeric).

9. `expenses`: id (uuid, PK), salon_id (uuid, FK), category (enum: 'generator_fuel', 'maintenance', 'supplies', 'rent'), amount (numeric), generator_hours_run (numeric, nullable), notes (text), logged_at (timestamp).

---

### CORE FEATURE MODULES TO IMPLEMENT

#### 1. Geofenced Staff Clock-In Engine

- Uses HTML5 Geolocation API on the staff mobile view.

- When staff clicks "Clock In", calculate distance from the device's GPS coordinates to the salon's stored `latitude` and `longitude` using the Haversine formula.

- If distance <= `geofence_radius_meters`, record clock-in as `is_within_geofence = true`. If outside, record `is_within_geofence = false` and flag an alert on the Admin Dashboard.

#### 2. Service Ticket & Automatic Commission Split

- Receptionist interface to open a ticket, enter client details, add one or multiple services, and assign a specific staff member to each service.

- System automatically calculates the commission split: `staff_commission_amount = service_price * staff.commission_rate`.

- Payment status picker: POS, Direct Bank Transfer, or Cash. Mark ticket as "Paid" once confirmed.

#### 3. Personal QR Code Tipping Generator

- Every Staff profile auto-generates a unique QR Code displaying their name, avatar, and a Paystack checkout URL.

- Show a dedicated "Tip Me" view where staff can display their QR code on their phone screen or render a printable card layout for mirror placement.

- Paystack tipping page pre-fills tip amounts (₦1,000, ₦2,000, ₦5,000, Custom) routed to the staff's `paystack_subaccount_code`.

#### 4. Auto-Deduct Inventory & Consumables Tracker

- Inventory management dashboard to list items (e.g., Hair Dye, Shampoo, Relaxer Kit) and set reorder alert thresholds.

- When creating a service ticket, allow linking consumed inventory items (e.g., selecting "Hair Dyeing" auto-suggests deducting 1 unit of "Black Hair Dye").

- Decrement inventory automatically upon ticket completion. Highlight low-stock items in RED on the Owner Dashboard.

#### 5. Generator & Fuel Expense Logger

- Form on Admin/Reception dashboard to log fuel purchases and generator running hours.

- Calculate and display: `Total Fuel Expense` and `Generator Overhead per Billed Service`.

#### 6. End-of-Day Audit & Anti-Fraud Report

- A "Close Day" button on the Admin Dashboard that aggregates:

  - Total Gross Revenue (POS vs Bank Transfer vs Cash)

  - Total Staff Commissions Payable

  - Total Generator/Fuel Expenses

  - Discrepancy Flag (Alerts if inventory decreased without a matching billed service ticket)

- Generates a clean, downloadable/printable single-page PDF summary.

---

### USER INTERFACE PAGES & NAVIGATION

1. `/login`: Supabase Email/Password + Role selector.

2. `/staff`: Staff mobile portal with Clock-In/Out status, daily earned commission tally, service history list, and "Show My Tip QR Code" modal.

3. `/reception`: Front-desk order desk with Quick Service Billing Form, Open Tickets List, POS/Transfer Matcher, and Clocked-In Staff status indicators.

4. `/admin`: Owner Dashboard with Revenue Metrics Cards, Staff Attendance Table, Generator Expense Logs, Low Inventory Badges, and End-of-Day Audit export button.

Start by scaffolding the complete layout, UI components, and mock database states. Ensure all interactions feel fast, smooth, and modern.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2d9b523d-225c-47ae-90ed-82740cf19c6e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
