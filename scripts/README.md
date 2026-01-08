# Database Setup

## Prisma ORM

This project uses **Prisma ORM** for type-safe database operations and migrations.

**`prisma/schema.prisma`** is the single source of truth for the database schema. All schema changes should be made in this file.

## Prisma Commands

### Development

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Create a new migration from schema changes
npm run db:migrate

# Push schema changes directly to database (dev only, no migration files)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Production/CI

```bash
# Deploy migrations to production (applies pending migrations)
npm run db:migrate:deploy
```

## Reset Database (Drop and Recreate)

**WARNING: This deletes all data!**

```bash
npm run db:reset
```

This will:
1. Drop all existing tables
2. Recreate the database
3. Apply all migrations from `prisma/migrations/`
4. Verify tables were created

## Migration Workflow

### Creating a New Migration

1. **Modify the schema**: Edit `prisma/schema.prisma`
2. **Create migration**: Run `npm run db:migrate -- --name descriptive-name`
   - This creates a migration file in `prisma/migrations/`
   - Applies the migration to your local database
3. **Review the migration**: Check the generated SQL in `prisma/migrations/`
4. **Commit**: Add migration files to git
5. **Deploy**: GitHub Actions will run `db:migrate:deploy` automatically

### For Existing Database (Baseline Migration)

If you have an existing database and want to start using Prisma:

1. Create initial migration: `npm run db:migrate -- --name init --create-only`
2. Manually edit the migration SQL to match your existing schema
3. Mark as applied: `npx prisma migrate resolve --applied init`
4. Future changes use normal migrations

## Manual Setup (Legacy)

For reference, the old SQL schema is still available at `src/lib/db/schema.sql`, but Prisma is now the source of truth.