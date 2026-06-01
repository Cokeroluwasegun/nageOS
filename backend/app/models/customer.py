import uuid
from sqlalchemy import Column, String, Integer, Numeric, Text, ARRAY, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), nullable=False)
    wa_phone = Column(String, nullable=False)
    name = Column(String)
    email = Column(String)
    tags = Column(ARRAY(String), default=[])
    notes = Column(Text)
    total_spent = Column(Numeric(12, 2), default=0)
    order_count = Column(Integer, default=0)
    last_seen_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
