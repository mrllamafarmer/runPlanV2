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
    """Get planned vs actual comparison"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.actual_gpx_data:
        raise HTTPException(status_code=404, detail="No actual data available")
    
    # Get calculated legs
    planned_legs = db.query(CalculatedLeg).filter(
        CalculatedLeg.event_id == event_id
    ).order_by(CalculatedLeg.leg_number).all()
    
    return {
        "planned_route": event.gpx_route,
        "actual_route": event.actual_gpx_data,
        "planned_legs": [CalculatedLegResponse.model_validate(leg) for leg in planned_legs],
        "comparison_summary": {
            "planned_distance": event.gpx_metadata.get('total_distance_meters') if event.gpx_metadata else 0,
            "actual_distance": event.actual_gpx_data.get('metadata', {}).get('total_distance_meters', 0)
        }
    }

