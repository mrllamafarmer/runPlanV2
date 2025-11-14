from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from database import get_db
from models import Waypoint, Event
from schemas import WaypointCreate, WaypointUpdate, WaypointResponse
from utils.gpx_processor import find_closest_point_on_route

router = APIRouter()

@router.post("", response_model=WaypointResponse, status_code=201)
def create_waypoint(waypoint: WaypointCreate, db: Session = Depends(get_db)):
    """Create a new waypoint"""
    # Verify event exists
    event = db.query(Event).filter(Event.id == waypoint.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Create waypoint
    db_waypoint = Waypoint(**waypoint.model_dump())
    
    # Calculate distance from start if route exists
    if event.gpx_route and "coordinates" in event.gpx_route:
        coords = event.gpx_route["coordinates"]
        closest_index, distance_from_start = find_closest_point_on_route(
            coords, waypoint.latitude, waypoint.longitude
        )
        db_waypoint.distance_from_start = distance_from_start
        
        # Get elevation from route if not provided
        if not db_waypoint.elevation and closest_index < len(coords):
            db_waypoint.elevation = coords[closest_index][2]
    
    # Calculate order index
    max_order = db.query(Waypoint).filter(Waypoint.event_id == waypoint.event_id).count()
    db_waypoint.order_index = max_order
    
    db.add(db_waypoint)
    db.commit()
    db.refresh(db_waypoint)
    return db_waypoint

@router.get("/{waypoint_id}", response_model=WaypointResponse)
def get_waypoint(waypoint_id: UUID, db: Session = Depends(get_db)):
    """Get a specific waypoint"""
    waypoint = db.query(Waypoint).filter(Waypoint.id == waypoint_id).first()
    if not waypoint:
        raise HTTPException(status_code=404, detail="Waypoint not found")
    return waypoint

@router.put("/{waypoint_id}", response_model=WaypointResponse)
def update_waypoint(waypoint_id: UUID, waypoint_update: WaypointUpdate, db: Session = Depends(get_db)):
    """Update a waypoint"""
    db_waypoint = db.query(Waypoint).filter(Waypoint.id == waypoint_id).first()
    if not db_waypoint:
        raise HTTPException(status_code=404, detail="Waypoint not found")
    
    update_data = waypoint_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_waypoint, key, value)
    
    # Recalculate distance if position changed
    if 'latitude' in update_data or 'longitude' in update_data:
        event = db.query(Event).filter(Event.id == db_waypoint.event_id).first()
        if event and event.gpx_route and "coordinates" in event.gpx_route:
            coords = event.gpx_route["coordinates"]
            closest_index, distance_from_start = find_closest_point_on_route(
                coords, db_waypoint.latitude, db_waypoint.longitude
            )
            db_waypoint.distance_from_start = distance_from_start
    
    db.commit()
    db.refresh(db_waypoint)
    return db_waypoint

@router.delete("/{waypoint_id}", status_code=204)
def delete_waypoint(waypoint_id: UUID, db: Session = Depends(get_db)):
    """Delete a waypoint"""
    db_waypoint = db.query(Waypoint).filter(Waypoint.id == waypoint_id).first()
    if not db_waypoint:
        raise HTTPException(status_code=404, detail="Waypoint not found")
    
    # Prevent deletion of START and FINISH waypoints
    if db_waypoint.name in ['START', 'FINISH']:
        raise HTTPException(status_code=400, detail="Cannot delete START or FINISH waypoints")
    
    db.delete(db_waypoint)
    db.commit()
    return None

