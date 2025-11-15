from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
from database import Base
import enum

class WaypointType(str, enum.Enum):
    checkpoint = "checkpoint"
    food = "food"
    water = "water"
    rest = "rest"

class DistanceUnit(str, enum.Enum):
    miles = "miles"
    kilometers = "kilometers"

class ElevationUnit(str, enum.Enum):
    meters = "meters"
    feet = "feet"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    planned_date = Column(DateTime, nullable=False)
    distance = Column(Float)  # in user's preferred unit
    target_duration_minutes = Column(Integer)
    elevation_gain_adjustment_percent = Column(Float, default=0)
    elevation_descent_adjustment_percent = Column(Float, default=0)
    fatigue_slowdown_percent = Column(Float, default=0)
    gpx_route = Column(JSON)  # optimized storage of coordinates
    gpx_metadata = Column(JSON)  # elevation, total distance, etc.
    actual_gpx_data = Column(JSON)  # post-race actual route
    actual_tcx_data = Column(JSON)  # alternative format
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    waypoints = relationship("Waypoint", back_populates="event", cascade="all, delete-orphan")
    calculated_legs = relationship("CalculatedLeg", back_populates="event", cascade="all, delete-orphan")

class Waypoint(Base):
    __tablename__ = "waypoints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name = Column(String)
    waypoint_type = Column(Enum(WaypointType))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation = Column(Float)
    stop_time_minutes = Column(Integer, default=0)
    comments = Column(Text)
    order_index = Column(Integer)  # sequence along route
    distance_from_start = Column(Float)  # cumulative distance
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    event = relationship("Event", back_populates="waypoints")

class CalculatedLeg(Base):
    __tablename__ = "calculated_legs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    leg_number = Column(Integer, nullable=False)
    start_waypoint_id = Column(UUID(as_uuid=True), ForeignKey("waypoints.id", ondelete="SET NULL"))
    end_waypoint_id = Column(UUID(as_uuid=True), ForeignKey("waypoints.id", ondelete="CASCADE"))
    leg_distance = Column(Float)
    elevation_gain = Column(Float)
    elevation_loss = Column(Float)
    base_pace = Column(Float)  # minutes per distance unit
    adjusted_pace = Column(Float)  # with elevation/fatigue
    expected_arrival_time = Column(DateTime)
    stop_time_minutes = Column(Integer)
    exit_time = Column(DateTime)
    cumulative_distance = Column(Float)
    cumulative_time_minutes = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    event = relationship("Event", back_populates="calculated_legs")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    file_type = Column(String)  # 'txt', 'pdf'
    content = Column(Text)
    summary = Column(Text)  # full document summary for embedding
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text)
    chunk_with_summary = Column(Text)  # chunk + document summary
    embedding = Column(Vector(1536))  # PGVector embedding (OpenAI text-embedding-3-small dimension)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="chunks")

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    distance_unit = Column(Enum(DistanceUnit), default=DistanceUnit.miles)
    pace_format = Column(String, default="mm:ss")
    elevation_unit = Column(Enum(ElevationUnit), default=ElevationUnit.feet)
    openai_api_key = Column(String)  # encrypted
    style_preferences = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"))
    title = Column(String)  # auto-generated from first message
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(JSON)  # for assistant messages with citations
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")

