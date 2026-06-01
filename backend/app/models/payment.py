import uuid
from sqlalchemy import Column, String, Numeric, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), nullable=False)
    order_id = Column(UUID(as_uuid=True))
    customer_id = Column(UUID(as_uuid=True))
    provider = Column(String, nullable=False)
    reference = Column(String)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, default="NGN")
    status = Column(String, default="pending")
    provider_response = Column(JSONB)
    verified_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
