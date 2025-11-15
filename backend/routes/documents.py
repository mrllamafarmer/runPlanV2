from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from database import get_db
from models import Document, DocumentChunk, UserSettings
from schemas import DocumentResponse
from utils.text_processor import process_document
from cryptography.fernet import Fernet
import os

router = APIRouter()

# Encryption setup (same as in settings.py and chat.py)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key().decode()
elif isinstance(ENCRYPTION_KEY, bytes):
    ENCRYPTION_KEY = ENCRYPTION_KEY.decode()

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def decrypt_value(value: str) -> str:
    """Decrypt a string value"""
    if not value:
        return None
    return cipher_suite.decrypt(value.encode()).decode()

@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a document to the vector store with full RAG processing
    - Extracts text from PDF or TXT
    - Chunks text into 500-token segments with 50-token overlap
    - Generates embeddings using OpenAI text-embedding-3-small
    - Stores chunks with embeddings for semantic search
    """
    # Get OpenAI API key from settings
    settings = db.query(UserSettings).first()
    if not settings or not settings.openai_api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not configured. Please set it in Settings first."
        )
    
    try:
        api_key = decrypt_value(settings.openai_api_key)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to decrypt OpenAI API key. Please reconfigure it in Settings."
        )
    
    # Verify file type
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in ['txt', 'pdf']:
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Process document (extract, chunk, embed)
    try:
        processed = await process_document(content, file.filename, api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    
    # Create document record
    db_document = Document(
        filename=file.filename,
        file_type=file_ext,
        content=processed['text'],
        summary=processed['summary']
    )
    
    db.add(db_document)
    db.flush()  # Get document ID before creating chunks
    
    # Create document chunks with embeddings
    for i, (chunk_text, chunk_with_context, embedding) in enumerate(
        zip(processed['chunks'], processed['chunks_with_context'], processed['embeddings'])
    ):
        db_chunk = DocumentChunk(
            document_id=db_document.id,
            chunk_index=i,
            chunk_text=chunk_text,
            chunk_with_summary=chunk_with_context,
            embedding=embedding
        )
        db.add(db_chunk)
    
    db.commit()
    db.refresh(db_document)
    
    return db_document

@router.get("", response_model=List[DocumentResponse])
def list_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all documents"""
    documents = db.query(Document).offset(skip).limit(limit).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: UUID, db: Session = Depends(get_db)):
    """Get a specific document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: UUID, db: Session = Depends(get_db)):
    """Delete a document and its chunks"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(db_document)
    db.commit()
    return None
