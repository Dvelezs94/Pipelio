/**
 * Legacy SQLite workspace migration — no longer used.
 * The app now uses Supabase (PostgreSQL). Run: npm run db:migrate
 */
console.error(
  "This script was for the old SQLite database and is no longer supported.\n" +
    "Use Supabase + Prisma migrations instead:\n" +
    "  1. Set DATABASE_URL and DIRECT_URL in .env (see .env.example)\n" +
    "  2. npm run db:migrate"
);
process.exit(1);
