import os
import logging
from typing import Optional, Dict, Any, List
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from dotenv import load_dotenv

# Load .env from both project root and backend dir
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(root_env):
    load_dotenv(root_env)
if os.path.exists(backend_env):
    load_dotenv(backend_env)

logger = logging.getLogger("InterviewLens.MongoDB")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "InterviewPostmartem")

class MongoDBManager:
    _instance: Optional['MongoDBManager'] = None
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None
    _is_connected: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
            cls._instance._init_connection()
        return cls._instance

    def _init_connection(self):
        try:
            # 5 second timeout for Atlas Cloud TLS handshake
            self._client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            # Ping database
            self._client.admin.command('ping')
            self._db = self._client[MONGODB_DB_NAME]
            self._is_connected = True
            logger.info(f"Connected successfully to MongoDB Atlas database '{MONGODB_DB_NAME}'")
            self._create_indexes()
        except Exception as e:
            self._is_connected = False
            logger.warning(f"MongoDB connection failed ({e}). Database service will use file/memory fallback if MongoDB server is offline.")

    def _create_indexes(self):
        if not self._is_connected or self._db is None:
            return
        try:
            # Index users by email
            self._db.users.create_index("email", unique=True)
            # Index interviews by id and created_at
            self._db.interviews.create_index("id", unique=True)
            self._db.interviews.create_index([("created_at", -1)])
            # Index sessions by token
            self._db.sessions.create_index("token", unique=True)
        except Exception as e:
            logger.warning(f"Error creating MongoDB indexes: {e}")

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    @property
    def db(self) -> Optional[Database]:
        return self._db

    def get_collection(self, name: str) -> Optional[Collection]:
        if self._is_connected and self._db is not None:
            return self._db[name]
        return None

# Singleton instance
mongo_manager = MongoDBManager()
