# run_api.py


import uvicorn
from dotenv import load_dotenv

if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()

    # Run API server
    print("Starting Rescue Dog Aggregator API...")
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
