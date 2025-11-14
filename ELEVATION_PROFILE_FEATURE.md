# 📊 Elevation Profile Feature

## ✨ What's New

The dashboard now includes an **interactive elevation profile chart** displayed below the map!

## 🎯 Features

### Visual Elevation Chart
- **X-axis**: Distance in miles
- **Y-axis**: Elevation in feet
- **Smooth gradient fill** for better visualization
- **Responsive design** fits any screen size

### Waypoint Markers
- All waypoints are plotted on the elevation chart
- **Color-coded by type**:
  - 🔵 **Checkpoint**: Blue
  - 🟢 **Food**: Green
  - 🟦 **Water**: Cyan
  - 🟣 **Rest**: Purple
- **Hover over markers** to see:
  - Waypoint name
  - Exact elevation
  - Distance from start

### Elevation Statistics
At the top of the chart, you'll see:
- **Total Distance**: Total route distance
- **Min Elevation**: Lowest point on the route
- **Max Elevation**: Highest point on the route
- **Elevation Gain**: Total climbing (+)
- **Elevation Loss**: Total descending (-)

### Waypoint Legend
Below the chart, a legend shows all waypoints with:
- Color-coded badges
- Waypoint name
- Distance from start

## 🖱️ How to Use

### 1. **Upload Your GPX File**
Once you upload a GPX file, the elevation profile automatically appears below the map.

### 2. **Add Waypoints**
As you add waypoints on the map, they instantly appear on the elevation profile.

### 3. **Interactive Exploration**
- **Hover over the elevation line**: See elevation and distance at any point
- **Hover over waypoint markers**: See detailed waypoint information
- **Visual correlation**: Compare map view with elevation view to understand terrain

## 📈 Use Cases

### Race Planning
- **Identify steep climbs**: See where you'll need to slow down
- **Plan aid station stops**: Place waypoints at elevation changes
- **Anticipate descents**: Know where you can pick up pace

### Pacing Strategy
- **Visualize difficulty**: Steep sections show as sharp elevation changes
- **Coordinate with pace calculator**: Understand why certain legs have slower paces
- **Energy management**: See total climbing to plan nutrition

### Course Familiarization
- **Study the profile**: Memorize major climbs and descents
- **Mental preparation**: Know what's coming at each mile marker
- **Strategic waypoints**: Place checkpoints at key elevation features

## 🎨 Example Interpretation

```
Elevation Profile Example:

    8,000 ft ┤     ╱╲              ╱╲
             │    ╱  ╲            ╱  ╲
    7,000 ft ┤   ╱    ╲          ╱    ╲
             │  ╱      ╲    🟢  ╱      ╲
    6,000 ft ┤ ╱        ╲      ╱        ╲
             │╱    🔵    ╲    ╱    🔵    ╲
    5,000 ft ┼────────────────────────────
             0mi  10mi   20mi  30mi   40mi

Legend:
🔵 Checkpoint at 10mi (6,000 ft) - Base of first climb
🟢 Food at 25mi (7,000 ft) - Top of first climb (need energy!)
🔵 Checkpoint at 35mi (6,000 ft) - After descent, before final climb
```

**What this tells you:**
1. **Miles 0-10**: Gradual climb (slower pace expected)
2. **Miles 10-15**: Steep climb (need food at top!)
3. **Miles 15-20**: Fast descent (recovery time)
4. **Miles 20-25**: Gradual section
5. **Miles 25-35**: Major climb and descent
6. **Miles 35-40**: Final push to finish

## 🔍 Technical Details

### Data Sampling
- For performance, the chart samples the GPX track to ~500 points
- This provides smooth visualization without lag
- Waypoints are matched to the nearest elevation point

### Calculations
- Distance: Haversine formula (accurate great-circle distance)
- Elevation: Converted from meters (GPX) to feet (display)
- Cumulative: Running total of distance from start

### Chart Library
- Built with **Chart.js** and **react-chartjs-2**
- Fully responsive and touch-friendly
- Optimized for performance with large datasets

## 💡 Pro Tips

### 1. **Use Elevation to Place Waypoints**
Place aid stations at:
- **Peaks**: You'll need food/rest after climbs
- **Valley bottoms**: Natural stopping points
- **Before climbs**: Fuel up before big efforts

### 2. **Correlate with Pace Adjustments**
- Set higher elevation gain adjustment for steep climbs
- Use the profile to validate your adjustment percentages
- If a section looks steep, expect the pace calculator to slow you down there

### 3. **Print-Friendly Planning**
- The elevation profile will be included in exported PDFs
- Use it during the race for reference
- Mark key elevation milestones on your crew sheet

### 4. **Compare Planned vs. Actual**
- After uploading actual race data, compare profiles
- See where you fell behind or gained time
- Identify elevation sections that were harder/easier than expected

## 🎉 Example Workflow

1. **Upload GPX file** → See your entire route elevation profile
2. **Study the terrain** → Identify major climbs and descents
3. **Add waypoints** → Place them at strategic elevation points
4. **Run calculations** → See how elevation affects each leg's pace
5. **Review the profile** → Validate that paces make sense for the terrain
6. **Adjust settings** → Fine-tune elevation gain/loss adjustments
7. **Recalculate** → Get your final race plan
8. **Export** → Take the profile with you on race day!

## 🚀 Ready to Use

Your elevation profile is now visible at **http://localhost:5173**!

1. Open your event
2. Upload a GPX file (if you haven't already)
3. Scroll down below the map
4. See your elevation profile with waypoints! 🎯

Enjoy the new visual insight into your ultra running routes! 📈🏔️

