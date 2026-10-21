# Architectural Decision: Unified 100% Next.js Full-Stack Architecture

## Context & Problem
Previously, the project was split across three distinct environments:
1. **Next.js Frontend (`frontend/`)**: Hosted on Vercel.
2. **Express Backend (`backend/`)**: Mounted on port 5000 with Prisma and route controllers.
3. **MT5 / Bridge**: Python/C++ local bridge on port 5003.

In production on Vercel, authentication failed because `frontend/auth.ts` executed an HTTP `fetch` to `http://localhost:5000/api/backend-auth/login`. Since Vercel is a serverless environment, `localhost:5000` does not exist, causing login and registration requests to fail with `ECONNREFUSED`. Furthermore, managing three separate servers created excessive DevOps overhead.

## Decision: Full Native Next.js Unification
Next.js was converted into a self-sufficient full-stack application, eliminating the need for an external Express backend for web application functionality:

1. **Direct Database Access via Prisma**:
   - Installed `@prisma/client` and `prisma` directly within `frontend/`.
   - Placed `schema.prisma` in `frontend/prisma/schema.prisma`.
   - Created a singleton Prisma client in `frontend/lib/prisma.ts` to prevent connection leaks across fast refreshes and serverless lambda lifecycles.
   - Updated `frontend/package.json` build script to `prisma generate && next build` so Vercel automatically generates the client during build.

2. **Native NextAuth Credentials Authorize**:
   - Refactored `frontend/auth.ts`: replaced the external HTTP fetch with direct queries via `prisma.user.findUnique` and `bcrypt.compare` for login, and `bcrypt.hash` + `prisma.user.create` for registration.
   - Removed external network latency and failure points during authentication.

3. **Native Next.js Route Handlers**:
   - Migrated core routes into App Router Route Handlers:
     - `app/api/trades/route.ts` (GET all trades with filters & pagination, POST create trade).
     - `app/api/trades/[id]/route.ts` (GET single trade, PUT update, DELETE trade).
     - `app/api/checklist/template/route.ts` (GET / PUT checklist template).
     - `app/api/checklist/submit/route.ts` (POST validate and record checklist).
     - `app/api/backend-auth/login/route.ts` and `app/api/backend-auth/register/route.ts` (backward-compatible fallback endpoints).

4. **Single-Host Vercel Deployment**:
   - Only **one repository / project** needs to be deployed to Vercel.
   - The user only needs to supply their cloud PostgreSQL connection string (from Neon or Supabase) as `DATABASE_URL` in Vercel project settings.
