# Berong Phase 2 - Setup Guide for New Developers

## Prerequisites
Make sure you have these installed:
- **Node.js** (v18 or higher) — [https://nodejs.org](https://nodejs.org)
- **pnpm** — Install with: `npm install -g pnpm`
- **PostgreSQL 17** — [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- **Git** — [https://git-scm.com](https://git-scm.com)

---

## Step 1: Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/kenji0011/berong-phase-2.git
cd berong-phase-2
```

If you already have the repo, just pull the latest changes:

```bash
git pull origin main
```

---

## Step 2: Install Dependencies

```bash
pnpm install
```

---

## Step 3: Set Up the Database

1. Open **pgAdmin** or your PostgreSQL terminal
2. Create a database called `berong_laravel` (or ask the team lead for the database dump)
3. Note down your PostgreSQL password — you'll need it for the next step

---

## Step 4: Create Your `.env` File

The `.env` file contains private settings and is NOT included in the repo for security.

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in these important values:

   ```env
   # Database — replace YOUR_PASSWORD with your PostgreSQL password
   # If your password has special characters, URL-encode them
   # (e.g., @ becomes %40, ! becomes %21)
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/berong_laravel?schema=public"

   # Gemini API Key — ask the team lead for this
   GEMINI_API_KEY="ask-team-lead-for-this"

   # JWT Secret — can be any random string
   JWT_SECRET="any-random-secret-string-here"
   ```

> ⚠️ Ask the team lead (Kean) for the actual GEMINI_API_KEY. Never share it publicly.

---

## Step 5: Generate Prisma Client

This connects your code to the database:

```bash
pnpm exec prisma generate
```

---

## Step 6: Seed the Database (Optional)

If your database is empty and you need test data:

```bash
node prisma/seed-production.js
```

This creates:
- Admin account: `admin` / `admin123`
- Test accounts: `testkid`, `testadult`, `testpro`

---

## Step 7: Run the App

```bash
pnpm dev
```

Open your browser and go to: **http://localhost:3000**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `pnpm: command not found` | Run `npm install -g pnpm` |
| Database connection error | Check your DATABASE_URL in `.env` — make sure PostgreSQL is running |
| Prisma errors | Run `pnpm exec prisma generate` again |
| Port 3000 already in use | Kill the process using port 3000 or change the port |

---

## Need Help?

Contact the team lead (Kean) for:
- Database dump file
- API keys
- Any setup issues
