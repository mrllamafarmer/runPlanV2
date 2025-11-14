from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database import get_db
from models import Event, Waypoint
from schemas import EventCreate, EventUpdate, EventResponse, GPXUploadResponse
from utils.gpx_processor import parse_gpx_file, meters_to_miles, meters_to_kilometers

router = APIRouter()

@router.post("", response_model=EventResponse, status_code=201)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """Create a new event"""
    db_event = Event(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("", response_model=List[EventResponse])
def list_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all events"""
    events = db.query(Event).offset(skip).limit(limit).all()
    return events

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: UUID, db: Session = Depends(get_db)):
    """Get a specific event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: UUID, event_update: EventUpdate, db: Session = Depends(get_db)):
    """Update an event"""
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_event, key, value)
    
    db.commit()
    db.refresh(db_event)
    return db_event

@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: UUID, db: Session = Depends(get_db)):
    """Delete an event"""
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(db_event)
    db.commit()
    return None

@router.post("/{event_id}/upload-gpx", response_model=GPXUploadResponse)
async def upload_gpx(event_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process GPX file for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Read GPX file
    content = await file.read()
    gpx_content = content.decode('utf-8')
    
    try:
        # Parse and optimize GPX
        gpx_data = parse_gpx_file(gpx_content)
        
        # Store optimized route and metadata
        event.gpx_route = {"coordinates": gpx_data["coordinates"]}
        event.gpx_metadata = {
            "total_distance_meters": gpx_data["total_distance_meters"],
            "elevation_gain_meters": gpx_data["elevation_gain_meters"],
            "elevation_loss_meters": gpx_data["elevation_loss_meters"],
            "min_elevation": gpx_data["min_elevation"],
            "max_elevation": gpx_data["max_elevation"],
            "bounding_box": gpx_data["bounding_box"],
            "original_points": gpx_data["original_points"],
            "simplified_points": gpx_data["simplified_points"]
        }
        
        # Update event distance if not set
        if not event.distance:
            distance_miles = meters_to_miles(gpx_data["total_distance_meters"])
            event.distance = distance_miles
        
        # Delete existing waypoints for clean start
        db.query(Waypoint).filter(Waypoint.event_id == event_id).delete()
        
        # Create START waypoint at first coordinate
        coords = gpx_data["coordinates"]
        if coords and len(coords) > 0:
            start_coord = coords[0]
            start_waypoint = Waypoint(
                event_id=event_id,
                name="START",
                waypoint_type="checkpoint",
                latitude=start_coord[0],
                longitude=start_coord[1],
                elevation=start_coord[2] if len(start_coord) > 2 else None,
                stop_time_minutes=0,
                order_index=0,
                distance_from_start=0,
                comments="Start of route"
            )
            db.add(start_waypoint)
            
            # Create FINISH waypoint at last coordinate
            finish_coord = coords[-1]
            finish_waypoint = Waypoint(
                event_id=event_id,
                name="FINISH",
                waypoint_type="checkpoint",
                latitude=finish_coord[0],
                longitude=finish_coord[1],
                elevation=finish_coord[2] if len(finish_coord) > 2 else None,
                stop_time_minutes=0,
                order_index=999999,  # Large number to keep it at end
                distance_from_start=gpx_data["total_distance_meters"],
                comments="End of route"
            )
            db.add(finish_waypoint)
        
        db.commit()
        
        return GPXUploadResponse(
            success=True,
            message=f"GPX file processed successfully. {gpx_data['simplified_points']} points from {gpx_data['original_points']} original. Start and Finish waypoints created.",
            metadata=event.gpx_metadata
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing GPX file: {str(e)}")

@router.post("/{event_id}/upload-actual", response_model=GPXUploadResponse)
async def upload_actual_gpx(event_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload actual GPX/TCX file for post-race analysis"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Read file
    content = await file.read()
    file_content = content.decode('utf-8')
    
    try:
        # Parse GPX (TCX support can be added later)
        gpx_data = parse_gpx_file(file_content)
        
        # Store actual data
        event.actual_gpx_data = {
            "coordinates": gpx_data["coordinates"],
            "metadata": {
                "total_distance_meters": gpx_data["total_distance_meters"],
                "elevation_gain_meters": gpx_data["elevation_gain_meters"],
                "elevation_loss_meters": gpx_data["elevation_loss_meters"]
            }
        }
        
        db.commit()
        
        return GPXUploadResponse(
            success=True,
            message="Actual route uploaded successfully",
            metadata=event.actual_gpx_data.get("metadata")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@router.get("/{event_id}/route")
def get_route(event_id: UUID, db: Session = Depends(get_db)):
    """Get optimized route data for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.gpx_route:
        raise HTTPException(status_code=404, detail="No route data available")
    
    return {
        "route": event.gpx_route,
        "metadata": event.gpx_metadata
    }

@router.get("/{event_id}/waypoints")
def get_event_waypoints(event_id: UUID, db: Session = Depends(get_db)):
    """Get all waypoints for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    waypoints = db.query(Waypoint).filter(Waypoint.event_id == event_id).order_by(Waypoint.order_index).all()
    return waypoints

