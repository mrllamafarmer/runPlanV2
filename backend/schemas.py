from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from models import WaypointType, DistanceUnit, ElevationUnit

# Event Schemas
class EventBase(BaseModel):
    name: str
    planned_date: datetime
    distance: Optional[float] = None
    target_duration_minutes: Optional[int] = None
    elevation_gain_adjustment_percent: float = 0
    elevation_descent_adjustment_percent: float = 0
    fatigue_slowdown_percent: float = 0

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    name: Optional[str] = None
    planned_date: Optional[datetime] = None
    distance: Optional[float] = None
    target_duration_minutes: Optional[int] = None
    elevation_gain_adjustment_percent: Optional[float] = None
    elevation_descent_adjustment_percent: Optional[float] = None
    fatigue_slowdown_percent: Optional[float] = None

class EventResponse(EventBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    gpx_metadata: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# Waypoint Schemas
class WaypointBase(BaseModel):
    name: Optional[str] = None
    waypoint_type: WaypointType
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    stop_time_minutes: int = 0
    comments: Optional[str] = None

class WaypointCreate(WaypointBase):
    event_id: UUID

class WaypointUpdate(BaseModel):
    name: Optional[str] = None
    waypoint_type: Optional[WaypointType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None
    stop_time_minutes: Optional[int] = None
    comments: Optional[str] = None

class WaypointResponse(WaypointBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    event_id: UUID
    order_index: Optional[int] = None
    distance_from_start: Optional[float] = None
    created_at: datetime

# Calculated Leg Schemas
class CalculatedLegResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    event_id: UUID
    leg_number: int
    start_waypoint_id: Optional[UUID] = None
    end_waypoint_id: Optional[UUID] = None
    leg_distance: Optional[float] = None
    elevation_gain: Optional[float] = None
    elevation_loss: Optional[float] = None
    base_pace: Optional[float] = None
    adjusted_pace: Optional[float] = None
    expected_arrival_time: Optional[datetime] = None
    stop_time_minutes: Optional[int] = None
    exit_time: Optional[datetime] = None
    cumulative_distance: Optional[float] = None
    cumulative_time_minutes: Optional[int] = None
    created_at: datetime

# Document Schemas
class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    filename: str
    file_type: str
    summary: Optional[str] = None
    uploaded_at: datetime

# Settings Schemas
class SettingsBase(BaseModel):
    distance_unit: DistanceUnit = DistanceUnit.miles
    pace_format: str = "mm:ss"
    elevation_unit: ElevationUnit = ElevationUnit.feet
    openai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    style_preferences: Optional[dict] = None

class SettingsUpdate(SettingsBase):
    pass

class SettingsResponse(SettingsBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

# Chat Schemas
class ChatMessage(BaseModel):
    message: str
    event_id: Optional[UUID] = None

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[dict]] = None

# GPX Upload Response
class GPXUploadResponse(BaseModel):
    success: bool
    message: str
    metadata: Optional[dict] = None

