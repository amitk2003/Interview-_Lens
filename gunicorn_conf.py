import os
import multiprocessing

# Gunicorn Configuration for InterviewLens Backend
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = int(os.getenv("GUNICORN_TIMEOUT", 120))
keepalive = 5

# Logging
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"
errorlog = "-"
capture_output = True
enable_stdio_inheritance = True

print(f"🚀 Starting Gunicorn server with {workers} Uvicorn workers on {bind} (timeout={timeout}s)")
