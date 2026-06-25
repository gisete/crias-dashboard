# Crias na Floresta — Dashboard

## Project
Registration management dashboard for a forest school. Replaces Google Sheets.
Used by 1-2 people. ~180 registrations/month.

## Tech
- Next.js 15 (App Router), TypeScript, Tailwind CSS 4
- Supabase PostgreSQL (no ORM — use @supabase/supabase-js directly)
- Vercel hosting at gestao.criasnaFloresta.pt

## Key conventions
- All UI text in Portuguese
- Server components by default, client components only when needed (interactivity, state)
- API routes in route handlers (no server actions)
- Database types in src/types/database.ts — keep in sync with schema
- Plan parsing logic in src/lib/plan-parser.ts — this is the source of truth for price/session/photo extraction

## Data model
Three main tables: families, registrations, children.
Families matched by email (upsert on webhook).
Registrations linked to families, children linked to registrations.

## Status flow
pendente → a_pagar → pago_confirmado
From a_pagar: can also go to lembrete (loops back) or cancelado.
All transitions except pendente trigger a Make webhook → Brevo email.

## Auth
Simple shared password via middleware cookie. No Supabase Auth.
/api/registrations/webhook is publicly accessible (no auth).

## Testing
Run plan parser tests: npx jest src/lib/__tests__/plan-parser.test.ts
