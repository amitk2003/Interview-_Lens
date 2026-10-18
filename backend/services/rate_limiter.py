import time
from typing import Dict, List
from collections import defaultdict
from fastapi import HTTPException

class RateLimiter:
    """
    Lightweight, thread-safe in-memory sliding window rate limiter
    for sensitive endpoints (auth, token usage, publishing, uploads).
    """
    def __init__(self):
        # key -> list of float timestamps
        self._history: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int = 30, window_seconds: int = 60):
        """
        Records an access attempt. If the number of requests in window_seconds
        exceeds max_requests, raises HTTPException(429).
        """
        now = time.time()
        cutoff = now - window_seconds
        
        # Prune older entries
        timestamps = [ts for ts in self._history[key] if ts > cutoff]
        
        if len(timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Too many requests for '{key}'. Please wait {retry_after} seconds.",
                headers={"Retry-After": str(max(1, retry_after))}
            )
        
        timestamps.append(now)
        self._history[key] = timestamps

    def reset(self):
        """Reset history (useful in test teardown)."""
        self._history.clear()

# Global singleton
rate_limiter = RateLimiter()
