# 📍 Add Waypoint by Distance Feature

## ✨ New Feature Added

You can now add waypoints directly from the **Leg-by-Leg Breakdown** table by specifying the exact cumulative distance!

## 🎯 Why This is Useful

### Precision Placement
- Enter exact distances from race materials (e.g., "Aid Station at mile 42.5")
- No need to guess where to click on the map
- Perfect for copying official checkpoint locations

### Easier Data Entry
- Type in distances from a crew sheet or race guide
- Faster than clicking on the map
- Less prone to placement errors

### Works Without the Map
- Add waypoints even if you're having trouble locating them visually
- Ideal for planning based on race documentation

## 🚀 How to Use

### 1. **Navigate to Your Event Dashboard**
After uploading a GPX file, scroll to the **Leg-by-Leg Breakdown** table.

### 2. **Click "Add Waypoint by Distance"**
Look for the green button in the top-right corner of the table (with a plus icon).

### 3. **Enter Waypoint Details**

The modal will prompt you for:

**Distance from Start (Required)** ⭐
- Enter cumulative distance in miles
- Example: `25.5` for a waypoint at mile 25.5
- The system shows your total route distance for reference
- Cannot exceed the total route length

**Waypoint Name** (Optional)
- Give it a meaningful name (e.g., "Michigan Bluff Aid Station")
- If left blank, auto-generates as "Waypoint at X.X mi"

**Waypoint Type**
- **Checkpoint / Aid Station**: Major support stops
- **Food Stop**: Locations with food available
- **Water Stop**: Water-only stops
- **Rest / Crew Access**: Rest areas or crew access points

**Stop Time (minutes)**
- How long you plan to stop
- Example: `5` for a 5-minute stop
- Default: `0` (no stop)

**Notes / Comments** (Optional)
- Add details about what's available
- Example: "Hot food, drop bag access, medical tent"

### 4. **Click "Add Waypoint"**
The waypoint will be created at the exact distance you specified!

## 📊 What Happens Next

### Automatic Coordinate Calculation
The system:
1. Calculates the exact lat/lon along your route at that distance
2. Interpolates between GPX points for precision
3. Extracts elevation data from the route

### Map Display
- The waypoint appears on the map at the calculated position
- Shows with appropriate color coding by type
- Can be edited or deleted like any waypoint

### Elevation Profile
- The waypoint appears on the elevation profile chart
- Helps visualize terrain at that checkpoint

### Recalculation Required
- The "Recalculate Now!" button appears (orange, pulsing)
- Click it to update leg times and paces with the new waypoint

## 💡 Example Use Cases

### Case 1: Official Race Checkpoints
```
Race Guide Says:
- Aid Station 1: Mile 15.3
- Aid Station 2: Mile 28.7
- Aid Station 3: Mile 42.1

You enter:
- Distance: 15.3, Name: "Aid Station 1", Type: Checkpoint, Stop: 3 min
- Distance: 28.7, Name: "Aid Station 2", Type: Checkpoint, Stop: 5 min
- Distance: 42.1, Name: "Aid Station 3", Type: Checkpoint, Stop: 5 min
```

### Case 2: Water Stops Between Aid Stations
```
You know there's a water stop at:
- Mile 7.5 (between checkpoints)

You enter:
- Distance: 7.5, Name: "Water Stop 1", Type: Water, Stop: 1 min
```

### Case 3: Crew Access Points
```
Crew sheet shows:
- Mile 22.0: Foresthill (crew access, 15-minute planned stop)

You enter:
- Distance: 22.0, Name: "Foresthill Crew Point", Type: Rest, Stop: 15 min
- Notes: "Drop bag, change shoes, refuel"
```

## 🔄 How It Works (Technical)

### Distance Calculation Algorithm
1. Iterates through GPX route coordinates
2. Calculates cumulative distance using Haversine formula (accurate great-circle distance)
3. When target distance is reached, interpolates exact position within the segment
4. Returns precise lat/lon and elevation at that distance

### Automatic Order Index
- Determines the correct order based on distance from start
- Inserts waypoint in proper sequence
- Maintains START → custom waypoints → FINISH order

### Validation
- Ensures distance is positive
- Checks distance doesn't exceed route length
- Alerts with helpful error messages if validation fails

## ✅ Features

### Smart Defaults
- Auto-generates names if not provided
- Defaults to 0 minutes stop time
- Pre-selects "Checkpoint" as default type

### User-Friendly
- Shows total route distance for reference
- Placeholders with example values
- Clear required vs. optional fields

### Integrated
- Works seamlessly with map-based waypoint creation
- All waypoints editable/deletable regardless of creation method
- Consistent behavior across all entry methods

## 🎨 UI Details

### Button Location
- **Top-right of Leg-by-Leg Breakdown table**
- **Green button** with plus icon
- **Label**: "Add Waypoint by Distance"
- Only visible when route data is loaded

### Modal Design
- Clean, focused form
- Large, touch-friendly inputs
- Clear labels and help text
- Cancel and Add buttons at bottom

### Visual Feedback
- Form validation on submit
- Alert messages for errors
- Automatic recalculation notice after creation

## 📝 Tips & Best Practices

### 1. **Use Race Documentation**
Copy checkpoint distances directly from official race materials for accuracy.

### 2. **Add Stop Times During Creation**
Easier to enter planned stop times upfront than editing later.

### 3. **Use Descriptive Names**
Helps you and your crew quickly identify checkpoints.

### 4. **Add Notes**
Include what's available (food, medical, drop bags, crew access).

### 5. **Recalculate After Batch Entry**
Add all waypoints first, then click "Recalculate Now!" once.

### 6. **Double-Check Distances**
Verify against race guide if available (some GPX files may differ from official distances).

## 🆚 Map Click vs. Distance Entry

### Use Map Click When:
- You want to place waypoints at visual landmarks
- You're exploring the route and adding ad-hoc waypoints
- You don't know exact distances

### Use Distance Entry When:
- You have exact distances from race materials
- You want precision placement
- You're entering multiple waypoints from a list
- Working from a crew sheet or pace plan

### Best Approach:
Use both! They complement each other perfectly.

## 🎉 Try It Now!

1. Go to **http://localhost:5173**
2. Open an event with a GPX file
3. Scroll to the **Leg-by-Leg Breakdown** table
4. Click the green **"Add Waypoint by Distance"** button
5. Enter a distance (e.g., half your route distance)
6. Click **"Add Waypoint"**
7. See it appear on the map, elevation profile, and table! 🎯

---

## 🔧 Under the Hood

**Files Modified**:
- `frontend/src/components/LegsTable.tsx` - Added modal, distance calculation, and creation logic
- `frontend/src/pages/Dashboard.tsx` - Passed `routeData` and `onWaypointCreate` props

**New Functions**:
- `findCoordinatesAtDistance()` - Calculates lat/lon at specified distance
- `handleAddWaypoint()` - Validates input and creates waypoint

**Algorithm Complexity**: O(n) where n = number of GPX coordinates

Enjoy precise waypoint placement! 📍✨

