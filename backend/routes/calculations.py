from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database import get_db
from models import Event, Waypoint, CalculatedLeg
from schemas import CalculatedLegResponse
from utils.gpx_processor import find_closest_point_on_route, calculate_leg_metrics, meters_to_miles
from utils.pace_calculator import calculate_legs

router = APIRouter()

@router.post("/events/{event_id}/calculate")
def calculate_event_legs(event_id: UUID, db: Session = Depends(get_db)):
    """Calculate pace and timing for all legs of an event"""
    # Get event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Verify requirements
    if not event.target_duration_minutes:
        raise HTTPException(status_code=400, detail="Target duration not set")
    
    if not event.gpx_route or "coordinates" not in event.gpx_route:
        raise HTTPException(status_code=400, detail="No route data available")
    
    # Get waypoints ordered by distance
    waypoints = db.query(Waypoint).filter(
        Waypoint.event_id == event_id
    ).order_by(Waypoint.distance_from_start).all()
    
    if not waypoints:
        raise HTTPException(status_code=400, detail="No waypoints defined")
    
    # Get route coordinates
    route_coords = event.gpx_route["coordinates"]
    
    # Calculate leg metrics
    leg_metrics = []
    prev_index = 0
    
    for waypoint in waypoints:
        # Find waypoint position on route
        closest_index, _ = find_closest_point_on_route(
            route_coords, waypoint.latitude, waypoint.longitude
        )
        
        # Calculate metrics for this leg
        metrics = calculate_leg_metrics(route_coords, prev_index, closest_index)
        leg_metrics.append(metrics)
        
        prev_index = closest_index
    
    # Prepare waypoint data for calculator
    waypoint_data = [
        {
            'id': wp.id,
            'name': wp.name,
            'stop_time_minutes': wp.stop_time_minutes
        }
        for wp in waypoints
    ]
    
    # Calculate legs
    calculated = calculate_legs(
        event_distance=event.distance or meters_to_miles(event.gpx_metadata.get('total_distance_meters', 0)),
        target_duration_minutes=event.target_duration_minutes,
        waypoints=waypoint_data,
        leg_metrics=leg_metrics,
        elevation_gain_adjustment=event.elevation_gain_adjustment_percent,
        elevation_descent_adjustment=event.elevation_descent_adjustment_percent,
        fatigue_slowdown=event.fatigue_slowdown_percent,
        start_time=event.planned_date
    )
    
    # Delete existing calculated legs
    db.query(CalculatedLeg).filter(CalculatedLeg.event_id == event_id).delete()
    
    # Store calculated legs
    db_legs = []
    for leg_data in calculated:
        db_leg = CalculatedLeg(
            event_id=event_id,
            leg_number=leg_data['leg_number'],
            start_waypoint_id=waypoints[leg_data['leg_number'] - 2].id if leg_data['leg_number'] > 1 else None,
            end_waypoint_id=leg_data['waypoint_id'],
            leg_distance=leg_data['leg_distance'],
            elevation_gain=leg_data['elevation_gain'],
            elevation_loss=leg_data['elevation_loss'],
            base_pace=leg_data['base_pace'],
            adjusted_pace=leg_data['adjusted_pace'],
            expected_arrival_time=leg_data['expected_arrival_time'],
            stop_time_minutes=leg_data['stop_time_minutes'],
            exit_time=leg_data['exit_time'],
            cumulative_distance=leg_data['cumulative_distance'],
            cumulative_time_minutes=int(leg_data['cumulative_time_minutes'])
        )
        db.add(db_leg)
        db_legs.append(db_leg)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Calculated {len(db_legs)} legs",
        "legs_count": len(db_legs)
    }

@router.get("/events/{event_id}/legs", response_model=List[CalculatedLegResponse])
def get_event_legs(event_id: UUID, db: Session = Depends(get_db)):
    """Get calculated legs for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    legs = db.query(CalculatedLeg).filter(
        CalculatedLeg.event_id == event_id
    ).order_by(CalculatedLeg.leg_number).all()
    
    return legs

@router.get("/events/{event_id}/comparison")
def get_comparison(event_id: UUID, db: Session = Depends(get_db)):
    """Get planned vs actual comparison with detailed performance analysis"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.actual_gpx_data:
        raise HTTPException(status_code=404, detail="No actual data available")
    
    # Get calculated legs and waypoints
    planned_legs = db.query(CalculatedLeg).filter(
        CalculatedLeg.event_id == event_id
    ).order_by(CalculatedLeg.leg_number).all()
    
    waypoints = db.query(Waypoint).filter(
        Waypoint.event_id == event_id
    ).order_by(Waypoint.order_index).all()
    
    # Extract metadata
    planned_distance_meters = event.gpx_metadata.get('total_distance_meters', 0) if event.gpx_metadata else 0
    actual_distance_meters = event.actual_gpx_data.get('metadata', {}).get('total_distance_meters', 0)
    
    planned_elevation_gain = event.gpx_metadata.get('elevation_gain_meters', 0) if event.gpx_metadata else 0
    actual_elevation_gain = event.actual_gpx_data.get('metadata', {}).get('elevation_gain_meters', 0)
    
    # Check if actual data has timestamps for time comparison
    has_actual_timestamps = event.actual_gpx_data.get('metadata', {}).get('has_timestamps', False)
    actual_duration_minutes = event.actual_gpx_data.get('metadata', {}).get('timestamp_duration_minutes')
    planned_duration_minutes = event.target_duration_minutes
    
    # Build leg-by-leg comparison if we have actual timestamps
    leg_comparisons = []
    if has_actual_timestamps and actual_duration_minutes and planned_legs:
        # TODO: For now, we'll estimate actual leg times proportionally
        # In future, we could match actual GPX timestamps to waypoints
        actual_to_planned_ratio = actual_duration_minutes / planned_duration_minutes if planned_duration_minutes else 1.0
        
        cumulative_planned_time = 0
        cumulative_actual_time = 0
        cumulative_time_diff = 0
        
        for i, leg in enumerate(planned_legs):
            # Find corresponding waypoint
            waypoint = next((w for w in waypoints if str(w.id) == str(leg.end_waypoint_id)), None)
            
            # Estimate actual leg time (proportional to planned)
            planned_leg_time = leg.cumulative_time_minutes - cumulative_planned_time if i > 0 else leg.cumulative_time_minutes
            estimated_actual_leg_time = planned_leg_time * actual_to_planned_ratio
            
            cumulative_planned_time = leg.cumulative_time_minutes
            cumulative_actual_time += estimated_actual_leg_time
            cumulative_time_diff = cumulative_actual_time - cumulative_planned_time
            
            leg_comparison = {
                "leg_number": leg.leg_number,
                "waypoint_name": waypoint.name if waypoint else f"Waypoint {leg.leg_number}",
                "planned_leg_time_minutes": round(planned_leg_time, 2),
                "estimated_actual_leg_time_minutes": round(estimated_actual_leg_time, 2),
                "leg_time_diff_minutes": round(estimated_actual_leg_time - planned_leg_time, 2),
                "cumulative_planned_time_minutes": round(cumulative_planned_time, 2),
                "cumulative_actual_time_minutes": round(cumulative_actual_time, 2),
                "cumulative_time_diff_minutes": round(cumulative_time_diff, 2),
                "planned_pace": leg.adjusted_pace,
                "distance_miles": round(leg.leg_distance, 2),
                "cumulative_distance_miles": round(leg.cumulative_distance, 2)
            }
            leg_comparisons.append(leg_comparison)
    
    # Summary statistics
    summary = {
        "planned_distance_meters": planned_distance_meters,
        "actual_distance_meters": actual_distance_meters,
        "distance_diff_meters": actual_distance_meters - planned_distance_meters,
        "distance_diff_percent": round(((actual_distance_meters - planned_distance_meters) / planned_distance_meters * 100), 2) if planned_distance_meters else 0,
        
        "planned_elevation_gain_meters": planned_elevation_gain,
        "actual_elevation_gain_meters": actual_elevation_gain,
        "elevation_diff_meters": actual_elevation_gain - planned_elevation_gain,
        
        "planned_duration_minutes": planned_duration_minutes,
        "actual_duration_minutes": actual_duration_minutes,
        "time_diff_minutes": (actual_duration_minutes - planned_duration_minutes) if (actual_duration_minutes and planned_duration_minutes) else None,
        "time_diff_percent": round(((actual_duration_minutes - planned_duration_minutes) / planned_duration_minutes * 100), 2) if (actual_duration_minutes and planned_duration_minutes) else None,
        
        "has_actual_timestamps": has_actual_timestamps,
        "planned_avg_pace": round(planned_duration_minutes / meters_to_miles(planned_distance_meters), 2) if planned_distance_meters and planned_duration_minutes else None,
        "actual_avg_pace": round(actual_duration_minutes / meters_to_miles(actual_distance_meters), 2) if actual_distance_meters and actual_duration_minutes else None
    }
    
    return {
        "planned_route": event.gpx_route,
        "actual_route": event.actual_gpx_data,
        "planned_legs": [CalculatedLegResponse.model_validate(leg) for leg in planned_legs],
        "comparison_summary": summary,
        "leg_comparisons": leg_comparisons,
        "waypoints": [{"id": str(w.id), "name": w.name, "order_index": w.order_index} for w in waypoints]
    }

