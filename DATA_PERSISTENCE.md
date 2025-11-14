# Data Persistence Guide

## Overview

Your database and uploaded files are now stored in the `./data` directory on your host machine, ensuring data survives Docker operations.

---

## Directory Structure

```
runPlanV2/
├── data/
│   ├── postgres/          # PostgreSQL database files
│   └── uploads/           # Uploaded GPX files and documents
```

---

## What This Means

### ✅ Data Survives These Operations:
- `docker-compose down`
- `docker-compose down --rmi all` (removes images but NOT the data directory)
- `docker-compose restart`
- `docker-compose stop` / `docker-compose start`
- Rebuilding containers with `--build`
- Deleting and recreating containers

### ⚠️ Data Will Be Lost If You:
- Manually delete the `./data` directory
- Run `rm -rf data/`

---

## Benefits

1. **Persistent Storage**: Your events, routes, waypoints, and calculations persist across container restarts
2. **Easy Backups**: Simply copy the `./data` directory to backup your entire database
3. **Version Control Safe**: The `./data` directory is in `.gitignore` so it won't be committed
4. **No Docker Volume Confusion**: No need to manage Docker named volumes

---

## Backup Your Data

### Quick Backup
```bash
# Create a backup
cp -r data data_backup_$(date +%Y%m%d)

# Or create a compressed backup
tar -czf data_backup_$(date +%Y%m%d).tar.gz data/
```

### Restore from Backup
```bash
# Stop the containers
docker-compose down

# Restore the data directory
rm -rf data/
cp -r data_backup_YYYYMMDD data/

# Start the containers
docker-compose up -d
```

---

## Moving to a New Machine

To move your entire setup to a new machine:

1. **Copy these files/directories:**
   ```bash
   # Required files
   - docker-compose.yml
   - backend/
   - frontend/
   - data/              # Your database and uploads!
   ```

2. **On the new machine:**
   ```bash
   docker-compose up -d
   ```

Your data will be immediately available!

---

## Cleanup Old Docker Volumes

If you had old named volumes from before this change, you can clean them up:

```bash
# List all volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Or remove specific old volumes
docker volume rm runplanv2_pgdata
docker volume rm runplanv2_backend_uploads
```

---

## Technical Details

### Before (Named Volumes)
```yaml
volumes:
  - pgdata:/var/lib/postgresql/data  # Docker-managed volume
```
- Stored in Docker's internal directory
- Hard to find and backup
- Lost with `docker-compose down -v`

### After (Bind Mounts)
```yaml
volumes:
  - ./data/postgres:/var/lib/postgresql/data  # Host directory
```
- Stored in your project directory
- Easy to backup and move
- Survives all Docker operations except manual deletion

---

## Troubleshooting

### "Permission Denied" Errors
If you get permission errors:
```bash
# PostgreSQL needs specific permissions
sudo chown -R 999:999 data/postgres/
```

### Database Won't Start
Check the logs:
```bash
docker-compose logs db
```

If the data directory is corrupted:
```bash
# Stop containers
docker-compose down

# Remove corrupted data
rm -rf data/postgres/*

# Restart (will initialize fresh database)
docker-compose up -d
```

### Checking Disk Space
```bash
# Check how much space your data is using
du -sh data/

# Detailed breakdown
du -sh data/*
```

---

## Best Practices

1. **Regular Backups**: Set up automated backups of the `./data` directory
2. **Git Ignore**: The `.gitignore` file already excludes `data/` - don't commit it!
3. **Safe Operations**: Use `docker-compose restart` instead of `down` when possible
4. **Monitor Size**: PostgreSQL data can grow large over time

---

## Quick Reference

### Safe Operations (Won't Lose Data)
```bash
docker-compose restart              # Restart services
docker-compose down && docker-compose up -d  # Recreate containers
docker-compose down --rmi all && docker-compose up -d --build  # Rebuild everything
```

### Dangerous Operations (Could Lose Data)
```bash
rm -rf data/                        # ❌ Deletes all your data!
docker-compose down -v              # ⚠️ Harmless now (we don't use named volumes)
```

---

## Summary

✅ **Your data is now safe!** Even `docker-compose down --rmi all` won't delete your database.  
✅ **Easy to backup**: Just copy the `./data` directory.  
✅ **Portable**: Move the entire project directory to keep your data.  
✅ **Version control friendly**: `data/` is git-ignored.

Your events, routes, and settings are now safely stored in `./data` and will persist indefinitely! 🎉

