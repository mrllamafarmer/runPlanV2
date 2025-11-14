# Calculation Fix & Enhanced Legs Table

## 🐛 Bug Fixed: Pace Calculation

### The Problem
The pace calculation had a critical unit conversion bug:
- `leg_distance` was in **meters**
- `adjusted_pace` was in **minutes per mile**
- The calculation was `leg_duration = leg_distance * adjusted_pace`

This caused incorrect timing because it was multiplying meters by minutes-per-mile!

### The Solution
Now properly converts distance to miles before applying pace:
```python
leg_distance_miles = leg_distance_meters / 1609.34
leg_duration_minutes = leg_distance_miles * adjusted_pace  # Correct!
```

## ✨ New Features: Enhanced Legs Table

### Interactive Table Features

The leg-by-leg breakdown table now includes:

#### 1. **Expandable Rows**
- Click the chevron (▼) to expand any row
- View detailed waypoint information
- See elevation, coordinates, and notes

#### 2. **Inline Editing**
- Click the pencil icon (✏️) to edit
- **Edit Stop Time**: Adjust how long you'll spend at this waypoint
- **Add/Edit Notes**: Add race day reminders, crew instructions, etc.
- Changes are saved to the database
- Click save (✓) to apply or cancel (✗) to discard

#### 3. **Delete Waypoints**
- Click the trash icon (🗑️) to delete a waypoint
- START and FINISH waypoints cannot be deleted
- Deletion requires recalculating the route

#### 4. **Better Time Formatting**
- **Cumulative Time** now shows in HH:MM:SS format (e.g., 24:30:15)
- All times properly formatted for race day reference

### How to Use

1. **View Details**: Click the ▼ chevron on any row
2. **Edit**: Click the ✏️ pencil icon
   - Modify stop time (in minutes)
   - Add notes like "Crew meeting point" or "Drop bag #2"
   - Click "Save Changes"
3. **Delete**: Click 🗑️ to remove custom waypoints
4. **Recalculate**: After changes, click "Calculate" button to update times

### Important Notes

⚠️ **After editing waypoints, you must recalculate!**
- Stop time changes affect arrival/exit times
- Deleting waypoints changes the route
- Click the "Calculate" button in the header after any changes

✅ **START and FINISH waypoints are protected**
- Cannot be deleted
- Can still edit stop times and notes
- Automatically created when uploading GPX

## 📊 What's Fixed

### Before Fix
- Wrong leg durations (way too long or short)
- Incorrect cumulative times
- Pace calculations didn't match reality

### After Fix
- ✅ Correct pace application (minutes per mile × miles)
- ✅ Accurate leg durations
- ✅ Proper cumulative times in HH:MM:SS
- ✅ Real-world reasonable pace calculations

## 🎯 Example

**100 mile race with 30 hour target:**
- Base pace: ~18 min/mile (30 hrs × 60 min / 100 miles)
- With elevation: Slower on climbs, faster on descents
- With fatigue: Gradually slows throughout race

The calculations now properly reflect this progression!

## 🔧 Testing the Fix

1. Upload a GPX file
2. Add waypoints along the route
3. Set a target duration (e.g., 30:00:00 for 30 hours)
4. Click "Calculate"
5. Check that:
   - Pace values seem reasonable (10-25 min/mile typically)
   - Cumulative time progresses logically
   - Final cumulative time ≈ target duration

## 💡 Tips

- **Stop Times**: Add 5-15 minutes at aid stations
- **Notes**: Include crew instructions, gear changes, etc.
- **Edit Often**: Fine-tune stop times as you learn the course
- **Recalculate**: Always recalculate after changes!

