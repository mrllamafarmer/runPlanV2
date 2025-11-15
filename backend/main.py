from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
from database import init_db
from routes import events, waypoints, calculations, documents, settings, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown (if needed)

app = FastAPI(
    title="Ultra Running Planner API",
    description="API for planning and analyzing long-distance running events",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]

# Custom middleware to ensure CORS headers on ALL responses including errors
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Add CORS headers to all responses, including error responses"""
    origin = request.headers.get("origin")

    # Handle preflight requests
    if request.method == "OPTIONS":
        response = JSONResponse(content={}, status_code=200)
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

    # Process the request
    try:
        response = await call_next(request)
    except Exception as e:
        # Handle any unhandled exceptions
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"}
        )

    # Add CORS headers to the response
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response

# CORS middleware (as fallback)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_cors_headers(request: Request) -> dict:
    """Get CORS headers for the request origin"""
    origin = request.headers.get("origin")
    # Only allow origins in our whitelist
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    # For non-whitelisted origins, don't set CORS headers
    return {}

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with proper CORS headers"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=get_cors_headers(request)
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with proper CORS headers"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers=get_cors_headers(request)
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions with proper CORS headers"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=get_cors_headers(request)
    )

# Include routers
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(waypoints.router, prefix="/api/waypoints", tags=["waypoints"])
app.include_router(calculations.router, prefix="/api/calculations", tags=["calculations"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
async def root():
    return {
        "message": "Ultra Running Planner API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

