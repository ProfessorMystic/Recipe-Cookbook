# backend/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# DATABASE_URL is an environment variable we can set later for PostgreSQL.
# If not set, default to SQLite (local file "recipes.db").
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./recipes.db")

# For SQLite we need an extra connect_args option to allow multi-threaded access.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# SessionLocal will be our database session factory.
# It will let us open/close sessions for talking to the DB.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base class for all ORM models.
class Base(DeclarativeBase):
    pass

# Dependency function for FastAPI routes: provides a DB session.
def get_db():
    db = SessionLocal()
    try:
        yield db  # Give the session to the request
    finally:
        db.close()  # Always close it after the request is done
