import datetime
import uuid
from typing import Generator
from sqlalchemy import create_engine, Column, DateTime, String
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Handle SQLite vs PostgreSQL configuration
connect_args = {}
if settings.DATABASE_URL.startswith('sqlite'):
    connect_args = {'check_same_thread': False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class CustomBase:
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

Base = declarative_base(cls=CustomBase)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
