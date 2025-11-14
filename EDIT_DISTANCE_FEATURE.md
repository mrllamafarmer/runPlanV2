# 📏 Edit Waypoint Distance Feature

## ✨ New Feature Added

You can now **edit the cumulative distance** of waypoints directly in the leg-by-leg breakdown table!

## 🎯 What This Does

When you edit a waypoint, you can now change its distance from the start. The system will:
1. **Recalculate coordinates** at the new distance along your GPX route
2. **Update latitude/longitude** to the new position
3. **Extract elevation** data from the new position
4. **Maintain the waypoint's other properties** (name, type, stop time, notes)

## 🚀 How to Use

### 1. **Open the Leg-by-Leg Breakdown**
After calculating your route, you'll see the leg-by-leg breakdown table.

### 2. **Expand a Row**
Click the chevron icon (▼) on the left of any leg row to expand it.

### 3. **Click Edit**
For custom waypoints (not START or FINISH), click the edit icon (pencil).

### 4. **Edit the Distance**
In the edit form, you'll now see:
- **Cumulative Distance (miles)** - The new editable field!
- Stop Time (minutes)
- Notes / Comments

### 5. **Change the Distance**
- Enter a new distance in miles (e.g., `42.5`)
- The system validates it's within route bounds
- Shows the maximum route distance for reference

### 6. **Save Changes**
Click "Save Changes" and the waypoint will:
- Move to the new position on the map
- Update its coordinates and elevation
- Maintain all other properties

### 7. **Recalculate**
After editing, click the "Recalculate Now!" button to update all leg times and paces.

## 🔒 Protected Waypoints

**START and FINISH waypoints cannot have their distance changed:**
- The distance field is **read-only** (grayed out)
- Shows message: "START and FINISH waypoints cannot be moved"
- This prevents accidental movement of route endpoints

## 💡 Use Cases

### Case 1: Correcting Waypoint Placement
```
Scenario: You placed a waypoint at mile 25, but it should be at 25.5

Solution:
1. Expand the row for that waypoint
2. Click edit
3. Change distance from 25.0 to 25.5
4. Save and recalculate
```

### Case 2: Moving Checkpoint to Match Official Distance
```
Scenario: Race guide says "Aid Station 3 at mile 42.7" but you placed it at 42.0

Solution:
1. Edit the waypoint
2. Change distance to 42.7
3. The waypoint moves to the exact official position
```

### Case 3: Fine-Tuning Multiple Waypoints
```
Scenario: You need to adjust several waypoints to match crew sheet

Solution:
1. Edit each waypoint in sequence
2. Update all distances
3. Click Recalculate once at the end
```

## 📊 What You See

### In Edit Mode (Expanded Row):
```
┌─────────────────────────────────────┬──────────────────────────┐
│ Cumulative Distance (miles)         │ Stop Time (minutes)      │
│ [42.5            ] (editable)       │ [5                ]      │
│ Max: 100.00 mi                      │                          │
└─────────────────────────────────────┴──────────────────────────┘

Notes / Comments
┌────────────────────────────────────────────────────────────────┐
│ Aid station with hot food, medical, and drop bags             │
└────────────────────────────────────────────────────────────────┘

                   [Cancel]  [Save Changes]
```

### In View Mode (Expanded Row):
```
Waypoint: Aid Station 3             Type: checkpoint
Distance: 42.50 mi                  Elevation: 5,200 ft
Stop Time: 5 minutes

Notes: Aid station with hot food, medical, and drop bags
```

## ⚙️ How It Works Technically

### Distance Validation
1. Checks distance is non-negative
2. Checks distance doesn't exceed route length
3. Provides helpful error messages if invalid

### Coordinate Calculation
Uses the same algorithm as "Add Waypoint by Distance":
1. Iterates through GPX route coordinates
2. Calculates cumulative distance using Haversine formula
3. Interpolates exact position when target distance is reached
4. Returns precise lat/lon and elevation

### Smart Updates
- Only recalculates coordinates if distance actually changed (>0.01 mile difference)
- Preserves all other waypoint properties
- Triggers recalculation notice automatically

## ✅ Features

### Validation & Safety
- ✅ Validates distance is within route bounds
- ✅ Shows maximum distance for reference
- ✅ Protects START/FINISH waypoints
- ✅ Clear error messages

### User Experience
- ✅ Inline editing in expanded row
- ✅ Read-only indicator for protected waypoints
- ✅ Helper text shows constraints
- ✅ Cancel button to discard changes

### Integration
- ✅ Works seamlessly with other edit features
- ✅ Triggers recalculation notice
- ✅ Updates map position automatically
- ✅ Updates elevation profile automatically

## 🎨 UI Details

### Distance Input Field
- **Type**: Number input
- **Step**: 0.1 miles
- **Min**: 0
- **Max**: Route distance
- **Disabled**: For START/FINISH waypoints
- **Helper Text**: Shows max distance or protection message

### Visual States
- **Normal**: White background, editable
- **Disabled** (START/FINISH): Gray background, "(read-only)" label
- **Error**: Red border with alert message

## 📝 Tips & Best Practices

### 1. **Use Official Distances**
If you have a race guide, use those exact distances for checkpoints.

### 2. **Round to One Decimal**
Most race materials use one decimal place (e.g., "25.5 mi").

### 3. **Edit Before Recalculating**
Make all your distance edits first, then recalculate once.

### 4. **Verify on Map**
After editing, check the map to ensure the waypoint moved to the right place.

### 5. **Check Elevation**
The elevation will auto-update - verify it makes sense for that location.

## 🔄 Complete Workflow Example

**Goal**: Adjust 3 waypoints to match official race guide

1. **View current layout**
   - Check leg-by-leg breakdown
   - Note which waypoints need adjustment

2. **Edit first waypoint**
   - Expand row → Click edit
   - Change distance: 15.0 → 15.3
   - Save

3. **Edit second waypoint**
   - Expand row → Click edit
   - Change distance: 28.5 → 28.7
   - Save

4. **Edit third waypoint**
   - Expand row → Click edit
   - Change distance: 42.0 → 42.1
   - Save

5. **Recalculate**
   - Click "Recalculate Now!" button
   - All leg times/paces update

6. **Verify**
   - Check map positions
   - Review elevation profile
   - Confirm leg breakdown looks correct

## 🎉 Try It Now!

1. Go to **http://localhost:5173**
2. Open an event with calculated legs
3. **Expand any custom waypoint row** (click ▼)
4. **Click the edit icon** (pencil)
5. **Change the distance** in the first input field
6. **Click "Save Changes"**
7. Watch it move on the map! 🎯

---

**Files Modified**:
- `frontend/src/components/LegsTable.tsx` - Added distance field to edit form and coordinate recalculation logic

**New Features**:
- Distance input in edit form
- Automatic coordinate recalculation
- Protection for START/FINISH waypoints
- Distance display in view mode

Enjoy precise waypoint positioning! 📏✨

