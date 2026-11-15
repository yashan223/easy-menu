# Easy Menu

Restaurant menu web app powered by TanStack Start, Neon Postgres & Better Auth.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and add your database & storage keys.

3. **Initialize database:**
   Run `db/schema.sql` in your Neon SQL Editor.

4. **Run app:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

## Admin Access

- Go to `/auth` to create the admin account.
- The 1st registered user becomes the admin; public sign-up is permanently locked immediately after.
- Visit `/admin` to add menu items and toggle the currency (`LKR` / `USD`).

