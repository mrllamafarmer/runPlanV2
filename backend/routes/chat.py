from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from database import get_db
from schemas import ChatMessage, ChatResponse, ChatSessionResponse, ChatMessageResponse
from models import Event, UserSettings, DocumentChunk, Waypoint, CalculatedLeg, ChatSession, ChatMessage as ChatMessageModel
from cryptography.fernet import Fernet
import os
import openai
import json
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()

# Encryption setup
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a new key if not set (for development only)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
elif isinstance(ENCRYPTION_KEY, bytes):
    ENCRYPTION_KEY = ENCRYPTION_KEY.decode()

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def decrypt_value(value: str) -> str:
    """Decrypt a string value"""
    if not value:
        return None
    return cipher_suite.decrypt(value.encode()).decode()

def get_event_context(event_id: str, db: Session) -> Optional[str]:
    """Get context about the current event"""
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            return None
        
        # Get waypoints
        waypoints = db.query(Waypoint).filter(Waypoint.event_id == event_id).order_by(Waypoint.order_index).all()
        
        # Get calculated legs
        legs = db.query(CalculatedLeg).filter(CalculatedLeg.event_id == event_id).order_by(CalculatedLeg.leg_number).all()
        
        # Build context string
        context = f"Current Event: {event.name}\n"
        context += f"Date: {event.planned_date.strftime('%Y-%m-%d')}\n"
        
        if event.distance:
            context += f"Distance: {event.distance:.2f} miles\n"
        
        if event.target_duration_minutes:
            hours = event.target_duration_minutes // 60
            minutes = event.target_duration_minutes % 60
            context += f"Target Duration: {hours}h {minutes}m\n"
        
        if event.gpx_metadata:
            metadata = event.gpx_metadata
            if 'total_distance_meters' in metadata:
                context += f"Total Distance: {metadata['total_distance_meters'] / 1609.34:.2f} miles\n"
            if 'elevation_gain_meters' in metadata:
                context += f"Elevation Gain: {metadata['elevation_gain_meters'] * 3.28084:.0f} feet\n"
            if 'elevation_loss_meters' in metadata:
                context += f"Elevation Loss: {metadata['elevation_loss_meters'] * 3.28084:.0f} feet\n"
        
        if waypoints:
            context += f"\nWaypoints ({len(waypoints)}):\n"
            for wp in waypoints[:10]:  # Limit to first 10 waypoints
                context += f"- {wp.name or wp.waypoint_type}: {(wp.distance_from_start or 0) / 1609.34:.2f} mi"
                if wp.stop_time_minutes:
                    context += f" (stop: {wp.stop_time_minutes} min)"
                context += "\n"
        
        if legs:
            context += f"\nCalculated Legs: {len(legs)} segments\n"
            context += f"Pace adjustments: Elevation gain {event.elevation_gain_adjustment_percent}%, "
            context += f"Descent {event.elevation_descent_adjustment_percent}%, "
            context += f"Fatigue {event.fatigue_slowdown_percent}%\n"
        
        return context
    except Exception as e:
        print(f"Error getting event context: {e}")
        return None

async def search_documents(query: str, api_key: str, db: Session, limit: int = 3) -> List[dict]:
    """Search document chunks using vector similarity with PGVector"""
    try:
        # Generate embedding for the query
        from utils.text_processor import generate_embeddings
        
        query_embeddings = await generate_embeddings([query], api_key)
        if not query_embeddings:
            return []
        
        query_embedding = query_embeddings[0]
        
        # Convert to string format for SQL
        embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        # Use PGVector cosine distance operator (<=>)
        # Lower distance = more similar
        query_sql = text("""
            SELECT 
                dc.chunk_text,
                d.filename,
                (dc.embedding <=> :embedding) as distance
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.embedding IS NOT NULL
            ORDER BY dc.embedding <=> :embedding
            LIMIT :limit
        """)
        
        result = db.execute(
            query_sql,
            {"embedding": embedding_str, "limit": limit}
        )
        
        results = []
        for row in result:
            results.append({
                "text": row.chunk_text[:500] + "..." if len(row.chunk_text) > 500 else row.chunk_text,
                "document": row.filename,
                "distance": float(row.distance)
            })
        
        return results
        
    except Exception as e:
        print(f"Error searching documents: {e}")
        import traceback
        print(traceback.format_exc())
        return []

@router.post("", response_model=ChatResponse)
async def chat(message: ChatMessage, db: Session = Depends(get_db)):
    """
    Send a message to the AI assistant with RAG capabilities and save to database
    """
    # Get settings for API keys
    settings = db.query(UserSettings).first()
    
    if not settings or not settings.openai_api_key:
        return ChatResponse(
            response="AI assistant is not configured. Please set your OpenAI API key in Settings.",
            sources=None
        )
    
    try:
        # Create or get session
        if message.session_id:
            session = db.query(ChatSession).filter(ChatSession.id == message.session_id).first()
            if not session:
                raise HTTPException(status_code=404, detail="Chat session not found")
        else:
            # Create new session
            session = ChatSession(
                event_id=message.event_id,
                title=message.message[:50] + ("..." if len(message.message) > 50 else "")  # Use first message as title
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        
        # Save user message
        user_msg = ChatMessageModel(
            session_id=session.id,
            role="user",
            content=message.message
        )
        db.add(user_msg)
        db.commit()
        
        # Decrypt API key and get AI settings
        api_key = decrypt_value(settings.openai_api_key)
        openai.api_key = api_key
        ai_model = settings.ai_model or "gpt-5-nano-2025-08-07"
        reasoning_effort = settings.reasoning_effort or "low"
        
        # Build context
        system_message = """You are an expert ultra running coach and advisor. You help runners plan and prepare for ultra marathons.

Your expertise includes:
- Training plans and periodization
- Nutrition and hydration strategies during long runs
- Pacing strategies for various terrains and conditions
- Gear recommendations
- Mental strategies for ultra running
- Recovery protocols
- Injury prevention

Provide detailed, practical advice based on the user's questions and the context provided."""

        # Get event context if provided
        event_context = None
        if message.event_id:
            event_context = get_event_context(str(message.event_id), db)
        
        # Search relevant documents using vector similarity
        relevant_docs = await search_documents(message.message, api_key, db)
        
        # Build the user message with context
        user_message = message.message
        
        if event_context:
            user_message = f"Context about my current race plan:\n{event_context}\n\nMy question: {message.message}"
        
        if relevant_docs:
            docs_text = "\n\n".join([f"From {doc['document']}: {doc['text']}" for doc in relevant_docs])
            user_message += f"\n\nRelevant information from uploaded documents:\n{docs_text}"
        
        # Call OpenAI API using responses endpoint for GPT-5 Nano with streaming
        client = openai.OpenAI(api_key=api_key)
        
        # Combine system and user messages for GPT-5
        combined_message = f"{system_message}\n\n{user_message}"
        
        # Create streaming generator
        def generate():
            try:
                stream = client.responses.create(
                    model=ai_model,
                    reasoning={"effort": reasoning_effort},
                    tools=[{"type": "web_search"}],  # Enable web search
                    tool_choice="auto",  # Let the model decide when to search
                    input=[
                        {"role": "user", "content": combined_message}
                    ],
                    max_output_tokens=8000,
                    stream=True
                )
                
                full_response = ""
                web_searches = []
                
                # Send session ID first
                yield f"data: {json.dumps({'session_id': str(session.id)})}\n\n"
                
                for event in stream:
                    # Log the event for debugging
                    print(f"Stream event type: {type(event)}, event: {event}")
                    
                    # Handle web search calls
                    if hasattr(event, 'type') and event.type == 'web_search_call':
                        search_info = {
                            'type': 'web_search',
                            'status': getattr(event, 'status', 'in_progress')
                        }
                        if hasattr(event, 'action'):
                            search_info['action'] = event.action
                        web_searches.append(search_info)
                        yield f"data: {json.dumps({'search': search_info})}\n\n"
                        continue
                    
                    # Try different ways to extract the content
                    chunk = None
                    if hasattr(event, 'output_text_delta'):
                        chunk = event.output_text_delta
                    elif hasattr(event, 'delta'):
                        chunk = event.delta
                    elif hasattr(event, 'text'):
                        chunk = event.text
                    elif hasattr(event, 'content'):
                        chunk = event.content
                    
                    if chunk:
                        full_response += chunk
                        # Send the chunk as SSE
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                    else:
                        # Send the raw event for debugging
                        print(f"Unknown event structure: {dir(event)}")
                
                # Save assistant message to database
                sources_list = []
                if relevant_docs:
                    sources_list = [{"document": doc["document"], "preview": doc["text"][:200]} for doc in relevant_docs]
                
                assistant_msg = ChatMessageModel(
                    session_id=session.id,
                    role="assistant",
                    content=full_response,
                    sources=sources_list if sources_list else None
                )
                db.add(assistant_msg)
                session.updated_at = datetime.utcnow()
                db.commit()
                
                # Send completion message with sources
                yield f"data: {json.dumps({'done': True, 'sources': sources_list})}\n\n"
                
            except Exception as e:
                error_msg = f"Error during streaming: {type(e).__name__}: {str(e)}"
                yield f"data: {json.dumps({'error': error_msg})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except openai.AuthenticationError:
        return ChatResponse(
            response="Authentication error: Your OpenAI API key appears to be invalid. Please check your API key in Settings.",
            sources=None
        )
    except openai.RateLimitError:
        return ChatResponse(
            response="Rate limit exceeded. Please try again in a moment.",
            sources=None
        )
    except openai.BadRequestError as e:
        return ChatResponse(
            response=f"API request error: {str(e)}. This may be due to an unsupported model or invalid parameters.",
            sources=None
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in chat endpoint: {type(e).__name__}: {str(e)}")
        print(f"Full traceback:\n{error_details}")
        return ChatResponse(
            response=f"Sorry, I encountered an error: {type(e).__name__}: {str(e)}. Please try again.",
            sources=None
        )

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(event_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Get chat sessions, optionally filtered by event_id
    """
    query = db.query(ChatSession).order_by(desc(ChatSession.updated_at))
    
    if event_id:
        query = query.filter(ChatSession.event_id == event_id)
    
    sessions = query.all()
    
    # Return sessions without messages for list view
    return [ChatSessionResponse(
        id=session.id,
        event_id=session.event_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=None
    ) for session in sessions]

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(session_id: str, db: Session = Depends(get_db)):
    """
    Get a specific chat session with all messages
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return ChatSessionResponse(
        id=session.id,
        event_id=session.event_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[ChatMessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=msg.content,
            sources=msg.sources,
            created_at=msg.created_at
        ) for msg in session.messages]
    )

@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    """
    Delete a chat session and all its messages
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db.delete(session)
    db.commit()
    
    return {"success": True, "message": "Chat session deleted"}

