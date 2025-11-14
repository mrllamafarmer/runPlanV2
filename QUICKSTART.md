# Ultra Running Planner - Quick Start Guide

## Prerequisites

- **Docker Desktop** installed and running
- At least 4GB of RAM available for Docker
- Ports 3000, 5432, and 8000 available

## Getting Started

### Option 1: Using the Startup Script (Recommended)

```bash
# Make the script executable
chmod +x start.sh

# Run the startup script
./start.sh
```

The script will:
- Check if Docker is running
- Create a `.env` file if needed
- Build and start all services
- Show you the access URLs

### Option 2: Manual Start

```bash
# Create environment file
cp .env.example .env

# Start services
docker-compose up --build
```

## Accessing the Application

Once started, open your browser to:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

## First Steps

### 1. Create Your First Event

1. Go to http://localhost:5173
2. Click **"New Event"**
3. Fill in:
   - Event name (e.g., "Western States 100")
   - Planned date and time
   - Target duration in HH:MM:SS format (e.g., 30:00:00 for 30 hours)
4. Click **"Create Event"**

**Note:** Distance is automatically calculated when you upload your GPX file, so you don't need to enter it manually.

### 2. Upload a GPX File

1. Open your event from the list
2. Click **"Upload GPX"** in the header
3. Select your GPX file
4. The route will appear on the map with elevation data
5. **START** and **FINISH** waypoints are automatically created at the beginning and end of your route
6. An **elevation profile chart** appears below the map showing the terrain with all waypoints marked

**Need a sample GPX file?**
- Download from [GPSies](https://www.gpsies.com/)
- Export from Strava or Garmin Connect
- Create one at [plotaroute.com](https://www.plotaroute.com/)

### 3. Add Waypoints

**Automatic Waypoints:**
- **START** (green with "S"): Created at the beginning of your route
- **FINISH** (red with "F"): Created at the end of your route
- These cannot be deleted, renamed, or moved

**Add Custom Waypoints:**
1. In the **Leg-by-Leg Breakdown** table, click **"Add Waypoint by Distance"**
2. Enter the cumulative distance (in miles or km based on your settings)
3. Enter a name for the waypoint (e.g., "Aid Station 3")
4. Select the waypoint type:
   - **Checkpoint**: Aid stations, checkpoints (blue)
   - **Food**: Major food stops (orange)
   - **Water**: Water-only stops (cyan)
   - **Rest**: Rest areas, crew access (purple)
5. Optionally set a stop time (in minutes)
6. Add any notes/comments
7. Click **"Add Waypoint"**
8. The waypoint will appear on the map and in the table

**Edit Waypoints:**
1. Click on any row in the leg-by-leg table to expand it
2. Click the **Edit** icon (pencil)
3. You can modify:
   - Waypoint name
   - Waypoint type
   - Cumulative distance (waypoint will move along the route)
   - Stop time
   - Notes/comments
4. Click **"Save Changes"**
5. Click **"Recalculate Now!"** to update pace calculations

**Delete Waypoints:**
- Click the trash icon in the expanded row, or
- Click the waypoint on the map and select "Delete Waypoint"
- START and FINISH waypoints cannot be deleted

### 4. Configure Pace Adjustments

In the **Pace Adjustments** panel:

- **Elevation Gain Adjustment**: How much slower per meter of climb (e.g., 0.01 = 1% slower)
- **Elevation Descent Adjustment**: Speed change on descents (often 0 or negative)
- **Fatigue Slowdown**: Progressive slowdown from start to finish (e.g., 5 = 5% slower at end)

Click **"Apply Adjustments"** to save.

### 5. Calculate Leg-by-Leg Breakdown

1. Make sure you have:
   - A GPX route uploaded
   - At least one waypoint
   - Target duration set
2. Click **"Calculate"** in the header
3. View the leg-by-leg table showing:
   - Distance for each leg
   - Elevation gain/loss
   - Adjusted pace
   - Arrival and exit times
   - Cumulative distance and time

## Advanced Features

### Settings

Go to **Settings** (top navigation) to:

- Change units (miles/km, feet/meters)
- Add OpenAI API key for AI Assistant
- Upload training documents for AI context

### Elevation Profile

The elevation profile chart (below the map) provides:

**Visual Features:**
- Interactive elevation graph with distance on X-axis and elevation on Y-axis
- All waypoints plotted and color-coded by type
- Smooth gradient fill for easy visualization

**Statistics Displayed:**
- Total distance
- Min/Max elevation
- Total elevation gain and loss

**How to Use:**
- **Hover over the line**: See elevation at any distance point
- **Hover over waypoint markers**: See waypoint details and elevation
- **Use with pace calculator**: Understand why certain legs have different paces
- **Strategic planning**: Place waypoints at key elevation features (peaks, valleys)

### Map Legend

The map legend (bottom-left corner) shows all waypoint types:

| Marker | Type | Description |
|--------|------|-------------|
| Green "S" | START | Beginning of route (auto-created) |
| Red "F" | FINISH | End of route (auto-created) |
| Blue dot | Checkpoint | Aid stations, checkpoints |
| Orange dot | Food | Major food stops |
| Cyan dot | Water | Water-only stops |
| Purple dot | Rest | Rest areas, crew access |

- Click any waypoint on the map to see details
- Custom waypoints can be deleted from the map popup
- START and FINISH waypoints cannot be modified

### AI Assistant

The AI Assistant is **fully functional** and powered by OpenAI's GPT-4o-mini. It provides expert ultra running advice with full context-awareness of your event.

**Features:**
- Context-aware responses based on your event details
- Expert knowledge in training, nutrition, pacing, and gear
- Analyzes your route, elevation, and waypoints
- Provides specific recommendations for YOUR race

**How to Use:**
1. Add your OpenAI API key in Settings
2. Navigate to your event dashboard
3. Find the AI Assistant panel (bottom-right)
4. Ask questions about training, strategy, nutrition, gear, etc.

**Example Questions:**
- "Given my target time and elevation, what pacing strategy should I use?"
- "What nutrition strategy should I follow for this race?"
- "Are my waypoint stops realistic?"
- "What gear should I pack for this event?"

**Cost:** ~$0.0003 per question (less than a penny) using GPT-4o-mini

📖 **See [AI_ASSISTANT_GUIDE.md](AI_ASSISTANT_GUIDE.md) for detailed instructions and examples**

### Post-Race Analysis

After your race:
1. Open your event
2. Upload actual GPX/TCX file
3. View comparison between planned and actual performance

## Common Issues

### Services won't start

```bash
# Check Docker is running
docker info

# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up --build
```

### Port already in use

If ports 5173, 5432, or 8000 are in use:

1. Edit `docker-compose.yml`
2. Change port mappings (e.g., `5174:3000` for frontend)
3. Restart: `docker-compose down && docker-compose up`

### Database connection errors

```bash
# Reset database
docker-compose down -v
docker-compose up --build
```

### Frontend can't connect to backend

1. Check backend is running: http://localhost:8000/health
2. Check CORS settings in `backend/main.py`
3. Verify `VITE_API_URL` in docker-compose.yml

## Stopping the Application

```bash
# Stop containers (data persists)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U runner -d ultraplanner

# Common commands:
\dt               # List tables
\d events         # Describe events table
SELECT * FROM events;
```

## Tips for Best Results

### GPX Files
- Use simplified routes (< 5000 points) for better performance
- Ensure elevation data is included
- Use routes from actual race courses when possible

### Waypoints
- Add waypoints in order along the route
- Be realistic with stop times
- Include all major aid stations

### Pace Adjustments
- Start conservative (lower adjustments)
- Test different values to match past performances
- Consider terrain difficulty beyond just elevation

### Calculations
- Recalculate after any changes to:
  - Waypoints
  - Pace adjustments
  - Target duration
  - Event settings

## Support

- **Issues**: Check logs with `docker-compose logs`
- **API Docs**: http://localhost:8000/docs for all endpoints
- **Database**: Direct access via `docker-compose exec db psql -U runner -d ultraplanner`

## What's Next?

- Upload training documents for AI context
- Experiment with different pacing strategies
- Use post-race analysis to improve future plans
- Export leg-by-leg breakdown for race day reference

Happy planning! 🏃‍♂️⛰️

