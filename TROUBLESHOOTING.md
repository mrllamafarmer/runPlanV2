# Troubleshooting Guide

## Common Issues and Solutions

### 🐳 Docker Issues

#### Docker not running
```
Error: Cannot connect to the Docker daemon
```

**Solution:**
- Start Docker Desktop
- Wait for it to fully initialize (whale icon in system tray)
- Try again: `docker-compose up`

#### Port already in use
```
Error: Bind for 0.0.0.0:5173 failed: port is already allocated
```

**Solution:**
1. Find what's using the port:
   ```bash
   # macOS/Linux
   lsof -i :5173
   # Windows
   netstat -ano | findstr :5173
   ```

2. Either stop that service or change the port in `docker-compose.yml`:
   ```yaml
   ports:
     - "5174:3000"  # Changed from 5173:3000
   ```

#### Containers won't start
```
Error: Container exited with code 1
```

**Solution:**
```bash
# View logs to see the error
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Clean rebuild
docker-compose down -v
docker-compose up --build
```

### 🗄️ Database Issues

#### Database connection failed
```
Error: could not connect to server: Connection refused
```

**Solution:**
1. Check if database container is running:
   ```bash
   docker-compose ps
   ```

2. Wait for database to be ready (it takes ~10 seconds on first start)

3. Check database logs:
   ```bash
   docker-compose logs db
   ```

4. Restart if needed:
   ```bash
   docker-compose restart db
   ```

#### PGVector extension not found
```
Error: extension "vector" does not exist
```

**Solution:**
- Ensure using `pgvector/pgvector:pg16` image in docker-compose.yml
- Rebuild: `docker-compose down -v && docker-compose up --build`

#### Tables not created
```
Error: relation "events" does not exist
```

**Solution:**
```bash
# Database initialization happens automatically
# If tables aren't created, check backend logs:
docker-compose logs backend

# Force recreation:
docker-compose down -v
docker-compose up --build
```

### 🖥️ Backend Issues

#### Module not found
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Rebuild backend container
docker-compose build backend
docker-compose up backend
```

#### GPX parsing error
```
Error: Error processing GPX file
```

**Solution:**
- Ensure GPX file is valid XML
- Check file has track points (not just routes or waypoints)
- Try exporting GPX again from source
- Test with a simple GPX file first

#### Calculation errors
```
Error: No route data available
```

**Solution:**
1. Upload GPX file first
2. Ensure GPX processed successfully (check map shows route)
3. Add at least one waypoint
4. Set target duration
5. Then click Calculate

### 🎨 Frontend Issues

#### White screen / App won't load
```
Blank page or loading forever
```

**Solution:**
1. Check browser console (F12) for errors
2. Verify backend is running: http://localhost:8000/health
3. Check CORS settings in backend
4. Clear browser cache
5. Try incognito/private mode

#### Map not displaying
```
Map tile errors or blank map
```

**Solution:**
1. Check internet connection (map tiles load from OpenStreetMap)
2. Check browser console for tile loading errors
3. Try different tile provider in MapView.tsx
4. Check if Leaflet CSS is loaded (view page source)

#### API calls failing
```
Network Error or CORS error
```

**Solution:**
1. Verify backend is running: `docker-compose ps`
2. Check API URL in browser: http://localhost:8000/docs
3. Verify VITE_API_URL in docker-compose.yml
4. Check backend logs: `docker-compose logs backend`
5. Restart services: `docker-compose restart`

### 📁 File Upload Issues

#### GPX upload fails
```
Error 400: Only .gpx files are supported
```

**Solution:**
- Ensure file extension is `.gpx`
- File must be valid GPX XML format
- Try re-exporting from source application
- File size should be reasonable (< 10MB)

#### Large GPX files slow
```
Browser becomes unresponsive
```

**Solution:**
- GPX files are simplified automatically
- Very large files (>10,000 points) may be slow
- Use simplified/reduced point GPX exports when possible
- Consider splitting multi-day routes

### ⚙️ Settings Issues

#### Settings not saving
```
Settings reset on page reload
```

**Solution:**
1. Check backend API: `docker-compose logs backend`
2. Verify database is running
3. Check browser console for API errors
4. Try clearing browser cache
5. Check if write permissions are correct

#### API keys not working
```
AI assistant says not configured
```

**Solution:**
1. Ensure API key is saved in Settings
2. API keys are encrypted in database
3. Check masked value shows (***xxxx)
4. OpenAI keys should start with `sk-`
5. Test key directly in OpenAI playground first

### 🗺️ Map & Waypoint Issues

#### Waypoints not appearing
```
Added waypoint but don't see it on map
```

**Solution:**
1. Check waypoint created successfully (no errors)
2. Zoom/pan map to see if outside view
3. Check browser console for errors
4. Reload page
5. Verify route is uploaded first

#### Can't click to add waypoint
```
Clicking map does nothing
```

**Solution:**
1. Click "Click Map to Add" button first
2. Ensure button shows "Cancel" when active
3. Route must be uploaded first
4. Try clicking directly on the route line
5. Check console for JavaScript errors

#### Distance from start is wrong
```
Waypoint shows incorrect distance
```

**Solution:**
- Distance is calculated along the route, not straight line
- Ensure waypoint is snapped to route
- Waypoint snaps to nearest point on route
- Try placing waypoint closer to route line

### 📊 Calculation Issues

#### Calculate button disabled
```
Can't click Calculate button
```

**Solution:**
Checklist before calculating:
- [ ] GPX route uploaded
- [ ] At least one waypoint added
- [ ] Target duration set in event
- [ ] Waypoints have distance calculated

#### Pace calculations seem wrong
```
Times/paces don't match expectations
```

**Solution:**
1. Check pace adjustment values (% can have big impact)
2. Verify target duration is in minutes
3. Check elevation data in GPX is correct
4. Test with adjustments set to 0 first
5. Fatigue slowdown applies linearly over entire route

#### Legs table is empty
```
No data after calculating
```

**Solution:**
1. Check backend logs: `docker-compose logs backend`
2. Verify calculation completed (no error message)
3. Refresh page
4. Try recalculating
5. Check database: 
   ```bash
   docker-compose exec db psql -U runner -d ultraplanner
   SELECT COUNT(*) FROM calculated_legs;
   ```

### 🔧 Development Issues

#### Hot reload not working
```
Changes not reflecting in browser
```

**Solution:**
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
uvicorn main:app --reload
```

#### TypeScript errors
```
Type errors in IDE but app runs
```

**Solution:**
```bash
cd frontend
npm install
# Restart TypeScript server in IDE
```

#### Database schema out of sync
```
Column doesn't exist errors
```

**Solution:**
```bash
# Recreate database
docker-compose down -v
docker-compose up --build
```

## 🔍 Debugging Commands

### View all logs
```bash
docker-compose logs -f
```

### View specific service logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Check service status
```bash
docker-compose ps
```

### Access database directly
```bash
docker-compose exec db psql -U runner -d ultraplanner

# Useful queries:
\dt                          # List tables
\d events                    # Describe events table
SELECT COUNT(*) FROM events; # Count events
SELECT * FROM events;        # View all events
```

### Restart single service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild specific service
```bash
docker-compose build backend
docker-compose up -d backend
```

### Clean everything and start fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 📞 Getting More Help

### Check the logs
Always start by checking logs:
```bash
docker-compose logs -f
```

### API Documentation
Interactive API docs at http://localhost:8000/docs

### Browser Console
Open developer tools (F12) and check Console and Network tabs

### Database Inspection
```bash
docker-compose exec db psql -U runner -d ultraplanner
```

### Common Log Locations
- Backend: `docker-compose logs backend`
- Frontend: Browser console (F12)
- Database: `docker-compose logs db`

## 🎯 Quick Fixes

### Nothing works after update
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database is corrupted
```bash
docker-compose down -v
docker-compose up --build
```

### Frontend won't connect to backend
1. Check http://localhost:8000/health
2. Check CORS in backend/main.py (should include localhost:5173)
3. Verify ports in docker-compose.yml

### Everything was working, now it's not
```bash
# Turn it off and on again
docker-compose restart

# If that doesn't work:
docker-compose down
docker-compose up
```

## 💡 Pro Tips

1. **Always check logs first** - Most errors are clearly explained in logs
2. **Use Docker Desktop** - Visual interface makes troubleshooting easier
3. **Test incrementally** - Test each feature as you build
4. **Keep backups** - Export your data regularly
5. **Start simple** - Use basic test data before complex real data

## ✅ Health Check Checklist

If something isn't working, go through this checklist:

1. [ ] Docker Desktop is running
2. [ ] All containers are up: `docker-compose ps`
3. [ ] Backend health: http://localhost:8000/health
4. [ ] Frontend loads: http://localhost:5173
5. [ ] Database accessible: `docker-compose exec db psql -U runner -d ultraplanner`
6. [ ] No port conflicts
7. [ ] No errors in logs: `docker-compose logs`
8. [ ] Environment variables set in `.env`

If all checks pass and it still doesn't work, check the specific issue sections above!

