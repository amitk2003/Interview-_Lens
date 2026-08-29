import os
import sys
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", "8000"))
    print("=" * 65)
    print("🚀 Starting InterviewLens AI Platform...")
    print(f"📡 Web Application & API available at: http://localhost:{port}")
    print("=" * 65)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=True)
