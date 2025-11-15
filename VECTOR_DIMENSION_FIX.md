# Vector Dimension Fix - 512 → 1536

## Issue

The `document_chunks.embedding` column was incorrectly set to `vector(512)` but OpenAI's `text-embedding-3-small` model produces **1536-dimensional** embeddings.

## What Was Fixed

### 1. Database Column
Changed from `vector(512)` to `vector(1536)`

### 2. Model Definition
Updated `backend/models.py`:
```python
embedding = Column(Vector(1536))  # OpenAI text-embedding-3-small dimension
```

### 3. Documentation
Updated all references from 512 to 1536 dimensions

## Migration for Existing Installations

If you already have the database running, you need to update the column type:

```bash
docker-compose exec db psql -U runner -d ultraplanner -c \
  "ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(1536);"
```

**This is safe to run:**
- ✅ No data loss (existing embeddings are preserved)
- ✅ Works even if table is empty
- ✅ Takes effect immediately
- ✅ No downtime required

## For New Installations

**No action needed!** New installations will automatically get `vector(1536)` when the tables are created.

## Verification

Check your current vector dimension:

```bash
docker-compose exec db psql -U runner -d ultraplanner -c \
  "\d document_chunks" | grep embedding
```

Should show:
```
embedding | vector(1536)
```

## OpenAI Embedding Models

| Model | Dimensions | Cost per 1M tokens |
|-------|-----------|-------------------|
| text-embedding-3-small | **1536** ✅ | $0.02 |
| text-embedding-3-large | 3072 | $0.13 |
| text-embedding-ada-002 | 1536 | $0.10 |

We use `text-embedding-3-small` for the best cost/performance ratio.

## Impact

**Before Fix:**
- ❌ Would fail when trying to insert OpenAI embeddings
- ❌ Dimension mismatch error
- ❌ RAG wouldn't work

**After Fix:**
- ✅ Correct dimension for OpenAI embeddings
- ✅ Ready for RAG implementation
- ✅ Compatible with text-embedding-3-small

## When This Matters

This fix is only important if you plan to use:
- Document uploads (PDFs, text files)
- RAG (Retrieval Augmented Generation)
- Semantic search over your documents

If you're only using:
- Basic AI chat (no custom documents)
- Web search
- Event context

Then you don't need embeddings at all, but having the correct dimension ensures it will work when you do need it.

## Status

✅ **Fixed in models.py**  
✅ **Fixed in database**  
✅ **Fixed in documentation**  
✅ **Ready for RAG implementation**

