# Database Setup

## Single Source of Truth

**`src/lib/db/schema.sql`** is the complete, final database schema. All changes have been merged into this file:
- ✅ No unique constraints on telemetry/locations (allows duplicate timestamps)
- ✅ device_latest uses foreign key references instead of duplicating data
- ✅ All indexes and constraints

## Reset Database (Drop and Recreate)

**WARNING: This deletes all data!**

```bash
npm run db:reset
```

This will:
1. Drop all existing tables
2. Recreate them from `src/lib/db/schema.sql`
3. Apply all indexes and constraints
4. Verify tables were created

## Manual Setup

Alternatively, you can run the schema directly:

```bash
psql -d your_database -f src/lib/db/schema.sql
```

