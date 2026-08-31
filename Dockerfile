# Production Dockerfile for InterviewLens Backend with Gunicorn
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application source code
COPY backend ./backend
COPY frontend/dist ./frontend/dist
COPY gunicorn_conf.py ./gunicorn_conf.py

# Expose backend port
ENV PORT=8000
EXPOSE 8000

# Run with Gunicorn using Uvicorn worker class
CMD ["gunicorn", "-c", "gunicorn_conf.py", "backend.main:app"]
