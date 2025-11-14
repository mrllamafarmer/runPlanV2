from typing import List, Dict, Optional
from datetime import datetime, timedelta

def calculate_adjusted_pace(
    base_pace: float,
    elevation_gain: float,
    elevation_loss: float,
    leg_distance: float,
    gain_adjustment_pct: float,
    loss_adjustment_pct: float,
    leg_position: int,
    total_legs: int,
    fatigue_slowdown_pct: float
) -> float:
    """
    Calculate adjusted pace for a leg with elevation and fatigue adjustments
    
    Args:
        base_pace: Base pace in minutes per distance unit
        elevation_gain: Elevation gain in meters
        elevation_loss: Elevation loss in meters
        leg_distance: Distance of leg in meters
        gain_adjustment_pct: % to slow down per meter of gain per meter distance
        loss_adjustment_pct: % to speed up per meter of loss per meter distance
        leg_position: Position of leg (0-indexed)
        total_legs: Total number of legs
        fatigue_slowdown_pct: Total fatigue slowdown percentage
    
    Returns:
        Adjusted pace in minutes per distance unit
    """
    if leg_distance == 0:
        return base_pace
    
    # Elevation adjustment
    gain_factor = (elevation_gain / leg_distance) * (gain_adjustment_pct / 100)
    loss_factor = (elevation_loss / leg_distance) * (loss_adjustment_pct / 100)
    elevation_adjusted_pace = base_pace * (1 + gain_factor - loss_factor)
    
    # Fatigue adjustment (linear degradation)
    if total_legs > 1:
        fatigue_factor = (leg_position / (total_legs - 1)) * (fatigue_slowdown_pct / 100)
    else:
        fatigue_factor = 0
    
    final_pace = elevation_adjusted_pace * (1 + fatigue_factor)
    
    return final_pace

def calculate_legs(
    event_distance: float,
    target_duration_minutes: int,
    waypoints: List[Dict],
    leg_metrics: List[Dict],
    elevation_gain_adjustment: float,
    elevation_descent_adjustment: float,
    fatigue_slowdown: float,
    start_time: datetime
) -> List[Dict]:
    """
    Calculate detailed leg-by-leg breakdown with proper time redistribution
    
    The key insight: adjustments should REDISTRIBUTE time, not ADD time.
    Total cumulative time should EQUAL target duration.
    
    Args:
        event_distance: Total distance in distance units (miles or km)
        target_duration_minutes: Target total time in minutes
        waypoints: List of waypoint dictionaries with stop_time_minutes
        leg_metrics: List of leg metrics (distance, elevation_gain, elevation_loss) in meters
        elevation_gain_adjustment: % adjustment per meter gain
        elevation_descent_adjustment: % adjustment per meter descent
        fatigue_slowdown: Total fatigue slowdown %
        start_time: Event start time
    
    Returns:
        List of calculated leg dictionaries
    """
    # Calculate total stop time
    total_stop_time = sum(wp.get('stop_time_minutes', 0) for wp in waypoints)
    
    # Available moving time (this is what we must distribute)
    moving_time_minutes = target_duration_minutes - total_stop_time
    
    # Step 1: Calculate adjustment factors for each leg (relative difficulty)
    leg_factors = []
    for i, metrics in enumerate(leg_metrics):
        leg_distance_meters = metrics['distance']
        elevation_gain = metrics['elevation_gain']
        elevation_loss = metrics['elevation_loss']
        leg_distance_miles = leg_distance_meters / 1609.34
        
        # Start with base distance
        factor = leg_distance_miles
        
        # Apply elevation adjustments (makes leg "longer" in terms of effort)
        if leg_distance_meters > 0:
            gain_factor = (elevation_gain / leg_distance_meters) * (elevation_gain_adjustment / 100)
            loss_factor = (elevation_loss / leg_distance_meters) * (elevation_descent_adjustment / 100)
            factor = factor * (1 + gain_factor - loss_factor)
        
        # Apply fatigue adjustment (linear progression)
        if len(leg_metrics) > 1:
            fatigue_factor = (i / (len(leg_metrics) - 1)) * (fatigue_slowdown / 100)
        else:
            fatigue_factor = 0
        factor = factor * (1 + fatigue_factor)
        
        leg_factors.append(factor)
    
    # Step 2: Calculate total adjusted distance
    total_adjusted_distance = sum(leg_factors)
    
    # Step 3: Distribute moving time proportionally based on factors
    legs = []
    cumulative_distance = 0
    cumulative_time_minutes = 0
    current_time = start_time
    
    for i, (waypoint, metrics, factor) in enumerate(zip(waypoints, leg_metrics, leg_factors)):
        leg_distance_meters = metrics['distance']
        elevation_gain = metrics['elevation_gain']
        elevation_loss = metrics['elevation_loss']
        leg_distance_miles = leg_distance_meters / 1609.34
        
        # Allocate time proportionally based on this leg's factor
        leg_duration_minutes = (factor / total_adjusted_distance) * moving_time_minutes
        
        # Calculate the actual pace for this leg
        adjusted_pace = leg_duration_minutes / leg_distance_miles if leg_distance_miles > 0 else 0
        
        # Base pace for reference (if no adjustments)
        base_pace = moving_time_minutes / event_distance if event_distance > 0 else 0
        
        # Calculate arrival time
        current_time += timedelta(minutes=leg_duration_minutes)
        arrival_time = current_time
        
        # Add stop time
        stop_time = waypoint.get('stop_time_minutes', 0)
        current_time += timedelta(minutes=stop_time)
        exit_time = current_time
        
        # Update cumulative values
        cumulative_distance += leg_distance_meters
        cumulative_time_minutes += leg_duration_minutes + stop_time
        
        leg = {
            'leg_number': i + 1,
            'waypoint_name': waypoint.get('name', f'Waypoint {i + 1}'),
            'waypoint_id': waypoint.get('id'),
            'leg_distance': leg_distance_meters,
            'elevation_gain': elevation_gain,
            'elevation_loss': elevation_loss,
            'base_pace': base_pace,
            'adjusted_pace': adjusted_pace,
            'leg_duration_minutes': leg_duration_minutes,
            'expected_arrival_time': arrival_time,
            'stop_time_minutes': stop_time,
            'exit_time': exit_time,
            'cumulative_distance': cumulative_distance,
            'cumulative_time_minutes': cumulative_time_minutes
        }
        
        legs.append(leg)
    
    return legs

def format_pace(pace_minutes_per_unit: float, format_type: str = "mm:ss") -> str:
    """
    Format pace as string
    
    Args:
        pace_minutes_per_unit: Pace in minutes per distance unit
        format_type: Format type ("mm:ss" or "decimal")
    
    Returns:
        Formatted pace string
    """
    if format_type == "mm:ss":
        minutes = int(pace_minutes_per_unit)
        seconds = int((pace_minutes_per_unit - minutes) * 60)
        return f"{minutes}:{seconds:02d}"
    else:
        return f"{pace_minutes_per_unit:.2f}"

def format_time(minutes: float) -> str:
    """
    Format time duration as HH:MM:SS
    
    Args:
        minutes: Time in minutes
    
    Returns:
        Formatted time string
    """
    hours = int(minutes // 60)
    mins = int(minutes % 60)
    secs = int((minutes % 1) * 60)
    return f"{hours:02d}:{mins:02d}:{secs:02d}"

