# Database Migration Guide

## Overview

This guide helps you update your existing database when new features require schema changes.

## Latest Migration: AI Model Settings (November 2025)

### What Changed
Added two new columns to `user_settings` table:
- `ai_model` - Stores the user's preferred AI model
- `reasoning_effort` - Stores the reasoning level (minimal, low, medium, high)

### Symptoms of Needing This Migration
- "Error loading settings" message on Settings page
- Backend logs show: `column user_settings.ai_model does not exist`
- 500 error when accessing `/api/settings`

### How to Migrate

**Option 1: Automatic (Recommended)**

Run this command from the project root:

```bash
docker-compose exec db psql -U runner -d ultraplanner -c "
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR DEFAULT 'gpt-5-nano-2025-08-07';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reasoning_effort VARCHAR DEFAULT 'low';
"
```

Then restart the backend:

```bash
docker-compose restart backend
```

**Option 2: Manual via psql**

1. Connect to the database:
```bash
docker-compose exec db psql -U runner -d ultraplanner
```

2. Run the ALTER commands:
```sql
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_model VARCHAR DEFAULT 'gpt-5-nano-2025-08-07';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reasoning_effort VARCHAR DEFAULT 'low';
```

3. Verify the columns were added:
```sql
\d user_settings
```

4. Exit psql:
```sql
\q
```

5. Restart the backend:
```bash
docker-compose restart backend
```

### Verification

After migration:
1. Go to **Settings** page
2. You should see:
   - OpenAI API Key field
   - AI Model field (with default: gpt-5-nano-2025-08-07)
   - Reasoning Effort dropdown (with default: Low)
3. No errors in browser console or backend logs

### For New Installations

New installations automatically get these columns via SQLAlchemy's `create_all()` method. No manual migration needed.

## General Migration Strategy

### When to Migrate

You need to migrate when:
- Pulling new code that adds database columns
- Seeing database-related errors after `git pull`
- Release notes mention "database migration required"

### Safe Migration Process

1. **Backup your data** (optional but recommended):
```bash
docker-compose exec db pg_dump -U runner ultraplanner > backup_$(date +%Y%m%d).sql
```

2. **Check what's running**:
```bash
docker-compose ps
```

3. **Apply the migration** (see specific migration above)

4. **Restart services**:
```bash
docker-compose restart backend
```

5. **Verify** the application works

### Rollback (if needed)

If migration causes issues:

1. **Restore from backup**:
```bash
docker-compose exec -T db psql -U runner ultraplanner < backup_YYYYMMDD.sql
```

2. **Revert code**:
```bash
git checkout <previous-commit>
docker-compose up -d --build
```

## Migration History

### 2025-11-15: AI Model Settings
- **Added columns**: `ai_model`, `reasoning_effort`
- **Table**: `user_settings`
- **Commands**: See above

### 2025-11-XX: Chat Persistence (Already Applied)
- **Added tables**: `chat_sessions`, `chat_messages`
- **Automatically created** by SQLAlchemy

### 2025-11-XX: Document RAG (Already Applied)
- **Added tables**: `documents`, `document_chunks`
- **Automatically created** by SQLAlchemy

## Troubleshooting

### "Role 'postgres' does not exist"
**Solution**: Use `runner` as the database user, not `postgres`
```bash
# Wrong:
psql -U postgres ...

# Correct:
psql -U runner ...
```

### "Database 'running_planner' does not exist"
**Solution**: The database is called `ultraplanner`
```bash
# Wrong:
psql -d running_planner ...

# Correct:
psql -d ultraplanner ...
```

### "Cannot connect to database"
**Solution**: Ensure containers are running
```bash
docker-compose ps
docker-compose up -d
```

### Migration runs but errors persist
**Solution**: Restart the backend to clear cached errors
```bash
docker-compose restart backend
```

### "Column already exists" during migration
**Solution**: This is fine! The `IF NOT EXISTS` clause handles this gracefully.

## Future Migrations

### How to Know When to Migrate

Watch for:
- **Release notes** mentioning database changes
- **Error messages** about missing columns/tables
- **Git commit messages** with "migration" or "database schema"

### Auto-Migration Plans

Future enhancement: Automatic migration system that:
- Detects schema changes
- Applies migrations automatically
- Tracks migration versions
- Provides rollback capabilities

## Need Help?

If you encounter issues:
1. Check backend logs: `docker-compose logs backend --tail=100`
2. Check database schema: `docker-compose exec db psql -U runner -d ultraplanner -c "\d user_settings"`
3. Open a GitHub issue with error details

