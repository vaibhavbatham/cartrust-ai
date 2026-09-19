import uuid
import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Report(Base):
    __tablename__ = 'reports'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    requested_by_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    report_type = Column(String(50), default='INTELLIGENCE', nullable=False)
    status = Column(String(50), default='READY', nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    pdf_file_path = Column(String(500), nullable=True)
    summary_json = Column(Text, nullable=True)

    vehicle = relationship('Vehicle', back_populates='reports')
    snapshots = relationship('ReportSnapshot', back_populates='report', cascade='all, delete-orphan')

class ReportSnapshot(Base):
    __tablename__ = 'report_snapshots'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    snapshot_data = Column(Text, nullable=False)

    report = relationship('Report', back_populates='snapshots')

class MLPrediction(Base):
    __tablename__ = 'ml_predictions'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    prediction_type = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    details_json = Column(Text, nullable=True)

class ModelVersion(Base):
    __tablename__ = 'model_versions'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    algorithm = Column(String(100), nullable=False)
    training_date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    metrics_json = Column(Text, nullable=True)
    artifact_path = Column(String(500), nullable=True)

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    action_url = Column(String(500), nullable=True)

class AIConversation(Base):
    __tablename__ = 'ai_conversations'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), default='Vehicle Query', nullable=False)

    messages = relationship('AIMessage', back_populates='conversation', cascade='all, delete-orphan', order_by='AIMessage.created_at')

class AIMessage(Base):
    __tablename__ = 'ai_messages'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    conversation_id = Column(String(36), ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    evidence_references_json = Column(Text, nullable=True)

    conversation = relationship('AIConversation', back_populates='messages')
