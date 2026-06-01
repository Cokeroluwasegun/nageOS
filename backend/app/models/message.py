import uuid
from sqlalchemy import Column, String, Boolean, Float, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), nullable=False)
    business_id = Column(UUID(as_uuid=True), nullable=False)
    wa_message_id = Column(String, unique=True)
    direction = Column(String, nullable=False)
    sender_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")
    ai_intent = Column(String)
    ai_confidence = Column(Float)
    is_read = Column(Boolean, default=False)
    sent_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
