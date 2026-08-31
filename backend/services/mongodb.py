import os
import logging
from typing import Optional

import certifi
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

logger = logging.getLogger("InterviewLens.MongoDB")

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv(
    "MONGODB_DB_NAME",
    "InterviewPostmartem"
)


class MongoDBManager:

    _instance: Optional["MongoDBManager"] = None
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

            if not MONGODB_URI:
                raise RuntimeError(
                    "MONGODB_URI environment variable is not set"
                )

            # NEVER print the actual URI because it contains credentials.
            logger.info(
                "MongoDB URI detected. Using Atlas: %s",
                MONGODB_URI.startswith("mongodb+srv://")
            )

            connect_kwargs = {
                "serverSelectionTimeoutMS": 10000,
                "connectTimeoutMS": 10000,
                "tls": True,
                "tlsCAFile": certifi.where(),
            }

            self._client = MongoClient(
                MONGODB_URI,
                **connect_kwargs
            )

            # Force an actual connection
            self._client.admin.command("ping")

            self._db = self._client[MONGODB_DB_NAME]
            self._is_connected = True

            logger.info(
                "Connected successfully to MongoDB Atlas database '%s'",
                MONGODB_DB_NAME
            )

            self._create_indexes()

        except Exception:
            self._is_connected = False
            logger.exception("MongoDB connection failed")

    def _create_indexes(self):

        if not self._is_connected or self._db is None:
            return

        try:
            self._db.users.create_index(
                "email",
                unique=True
            )

            self._db.interviews.create_index(
                "id",
                unique=True
            )

            self._db.interviews.create_index(
                [("created_at", -1)]
            )

            self._db.sessions.create_index(
                "token",
                unique=True
            )

        except Exception:
            logger.exception(
                "Error creating MongoDB indexes"
            )

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    @property
    def db(self) -> Optional[Database]:
        return self._db

    def get_collection(
        self,
        name: str
    ) -> Optional[Collection]:

        if self._is_connected and self._db is not None:
            return self._db[name]

        return None


mongo_manager = MongoDBManager()