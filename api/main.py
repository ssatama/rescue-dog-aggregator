# api/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routes
from api.routes import dogs, organizations

# Create FastAPI app
app = FastAPI(
    title="Rescue Dog Aggregator API",
    description="API for accessing rescue dog data from various organizations",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dogs.router, prefix="/api/animals", tags=["animals"])
# Keep the old endpoint for backward compatibility
app.include_router(dogs.router, prefix="/api/dogs", tags=["dogs"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])

@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to the Rescue Dog Aggregator API",
        "version": "0.1.0",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)