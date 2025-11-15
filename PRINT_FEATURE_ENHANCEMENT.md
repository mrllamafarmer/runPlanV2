# Enhanced Print Feature

## Overview
The print facility has been completely redesigned to create comprehensive, professional race plan documents suitable for printing or saving as PDF.

## What's Included

### Page 1: Race Overview
- **Event Header**
  - Race name
  - Date and start time
  - Total distance
  - Target duration
  - Total elevation gain/loss

- **Route Map**
  - Full route visualization
  - All waypoint markers color-coded by type
  - START (green) and FINISH (red) clearly marked
  - Scale optimized to show entire route

- **Elevation Profile Chart**
  - Full elevation visualization
  - Waypoint markers plotted on the chart
  - Distance on X-axis (miles)
  - Elevation on Y-axis (feet)

### Subsequent Pages: Detailed Leg-by-Leg Breakdown
For each leg, the following information is printed:

**Basic Info:**
- Leg number and waypoint name
- Waypoint type (checkpoint, food, water, rest)
- Leg distance (miles)
- Elevation gain and loss (feet)
- Waypoint elevation (feet)

**Timing & Pacing:**
- Base pace (min/mile)
- Adjusted pace (min/mile, accounting for terrain and fatigue)
- Leg time (HH:MM:SS)
- Expected arrival time (HH:MM)
- Stop time (minutes)
- Exit time (HH:MM)

**Cumulative Stats:**
- Cumulative distance from start
- Cumulative time from start

**Notes:**
- Any comments or notes added to waypoints

## How to Use

1. Navigate to your event dashboard
2. Click the **"Print"** button in the header
3. A print preview will appear showing the complete race plan
4. The print dialog will automatically open
5. Options:
   - **Print to printer**: Send directly to a printer
   - **Save as PDF**: Select "Save as PDF" as the destination

## Print Settings Tips

For best results:
- **Orientation**: Portrait
- **Margins**: Normal
- **Scale**: 100%
- **Background graphics**: Enabled (to show map tiles)

## Features

✅ **Complete Information**: All data visible in the app, including details hidden behind expand buttons, is included

✅ **Professional Layout**: Clean, organized layout optimized for physical reference during races

✅ **Page Breaks**: Intelligent page breaks ensure leg information isn't split across pages

✅ **Visual Maps**: Both route map and elevation profile for quick reference

✅ **Print-Optimized**: Special styling ensures clean output without unnecessary UI elements

✅ **Mobile-Friendly**: Works on all devices

## Use Cases

- **Race Day Reference**: Print and bring to the race for quick reference
- **Crew Instructions**: Share with crew members who will support you
- **Training Analysis**: Review and annotate for training purposes
- **Archive**: Save as PDF to maintain records of all your race plans
- **Sharing**: Email PDF to running partners or coaches

## Technical Notes

The print view:
- Renders the entire route map with Leaflet.js
- Draws a custom elevation chart on HTML Canvas
- Hides all unnecessary UI elements (navigation, buttons, etc.)
- Uses CSS `@media print` rules for optimal printing
- Includes `page-break-inside: avoid` to prevent splitting important sections
- Automatically triggers browser print dialog after rendering

## Example Output Structure

```
┌─────────────────────────────────┐
│ PAGE 1: OVERVIEW                │
│                                 │
│ [Event Name and Details]        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    ROUTE MAP WITH MARKERS   │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │   ELEVATION PROFILE CHART   │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ PAGE 2+: LEG DETAILS            │
│                                 │
│ Leg 1: START                    │
│ ├─ Type, Distance, Elevation    │
│ ├─ Pacing Information           │
│ ├─ Timing Information           │
│ └─ Notes                        │
│                                 │
│ Leg 2: Aid Station 1            │
│ ├─ Type, Distance, Elevation    │
│ ├─ Pacing Information           │
│ ├─ Timing Information           │
│ └─ Notes                        │
│                                 │
│ [... continues for all legs]    │
└─────────────────────────────────┘
```

## Future Enhancements

Potential additions:
- Custom branding/logos
- QR codes linking back to live plan
- Weather integration for race day
- Nutritional recommendations per leg
- Equipment checklist
- Emergency contact information
- Alternative route options

## Support

If the print view doesn't appear or behaves unexpectedly:
1. Ensure you have waypoints and legs calculated
2. Refresh the page and try again
3. Check that your browser allows pop-ups from the site
4. Try a different browser (Chrome/Firefox recommended)

