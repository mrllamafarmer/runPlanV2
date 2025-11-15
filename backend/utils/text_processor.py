"""
Text Processing Utilities for RAG
Handles document chunking and embedding generation
"""

import tiktoken
from typing import List, Dict
import openai
from pypdf import PdfReader
import io


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n\n"
        
        return text.strip()
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split text into chunks with overlap
    
    Args:
        text: The text to chunk
        chunk_size: Target chunk size in tokens (default: 500)
        overlap: Number of overlapping tokens between chunks (default: 50)
    
    Returns:
        List of text chunks
    """
    # Use tiktoken to count tokens (cl100k_base is used by text-embedding-3-small)
    encoding = tiktoken.get_encoding("cl100k_base")
    tokens = encoding.encode(text)
    
    chunks = []
    start = 0
    
    while start < len(tokens):
        # Get chunk
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        
        # Decode back to text
        chunk_text = encoding.decode(chunk_tokens)
        chunks.append(chunk_text)
        
        # Move start position with overlap
        start = end - overlap
    
    return chunks


def generate_document_summary(text: str, max_length: int = 500) -> str:
    """
    Generate a brief summary of the document
    For now, just returns the first max_length characters
    In future, could use LLM to generate proper summary
    """
    if len(text) <= max_length:
        return text
    
    # Take first max_length chars and try to end at a sentence
    summary = text[:max_length]
    last_period = summary.rfind('.')
    if last_period > max_length // 2:
        summary = summary[:last_period + 1]
    else:
        summary += "..."
    
    return summary


async def generate_embeddings(texts: List[str], api_key: str) -> List[List[float]]:
    """
    Generate embeddings for a list of texts using OpenAI
    
    Args:
        texts: List of text strings to embed
        api_key: OpenAI API key
    
    Returns:
        List of embedding vectors (each is a list of 1536 floats)
    """
    if not texts:
        return []
    
    try:
        client = openai.OpenAI(api_key=api_key)
        
        # OpenAI allows batch embedding requests
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
            encoding_format="float"
        )
        
        # Extract embeddings in order
        embeddings = [data.embedding for data in response.data]
        
        return embeddings
        
    except Exception as e:
        raise Exception(f"Error generating embeddings: {str(e)}")


def prepare_chunk_for_embedding(chunk_text: str, document_summary: str) -> str:
    """
    Prepare a chunk for embedding by combining it with document context
    This helps the embeddings capture the document's overall topic
    
    Args:
        chunk_text: The chunk text
        document_summary: Brief summary of the overall document
    
    Returns:
        Combined text for embedding
    """
    return f"Document: {document_summary}\n\nChunk: {chunk_text}"


async def process_document(
    file_content: bytes,
    filename: str,
    api_key: str
) -> Dict:
    """
    Process a document end-to-end: extract text, chunk, and generate embeddings
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        api_key: OpenAI API key for embeddings
    
    Returns:
        Dict with 'text', 'summary', 'chunks', and 'embeddings'
    """
    # Extract text
    file_ext = filename.split('.')[-1].lower()
    
    if file_ext == 'pdf':
        text = extract_text_from_pdf(file_content)
    elif file_ext == 'txt':
        text = file_content.decode('utf-8')
    else:
        raise Exception(f"Unsupported file type: {file_ext}")
    
    if not text or len(text.strip()) < 50:
        raise Exception("Document appears to be empty or too short")
    
    # Generate summary
    summary = generate_document_summary(text)
    
    # Chunk the text
    chunks = chunk_text(text)
    
    if not chunks:
        raise Exception("No chunks generated from document")
    
    # Prepare chunks with context
    chunks_with_context = [
        prepare_chunk_for_embedding(chunk, summary)
        for chunk in chunks
    ]
    
    # Generate embeddings
    embeddings = await generate_embeddings(chunks_with_context, api_key)
    
    if len(embeddings) != len(chunks):
        raise Exception(f"Embedding count mismatch: {len(embeddings)} vs {len(chunks)}")
    
    return {
        'text': text,
        'summary': summary,
        'chunks': chunks,
        'chunks_with_context': chunks_with_context,
        'embeddings': embeddings
    }

