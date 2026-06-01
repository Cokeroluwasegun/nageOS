import uuid
from sqlalchemy import Column, String, Boolean, Float, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    phone_number_id = Column(String)
    wa_access_token = Column(Text)
    wa_verify_token = Column(Text)
    plan = Column(String, default="trial")
    ai_enabled = Column(Boolean, default=True)
    ai_model = Column(String, default="anthropic/claude-sonnet-4-5")
    ai_greeting = Column(Text)
    escalation_threshold = Column(Float, default=0.7)
    trial_ends_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
