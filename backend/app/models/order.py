import uuid
from sqlalchemy import Column, String, Numeric, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), nullable=False)
    customer_id = Column(UUID(as_uuid=True), nullable=False)
    order_number = Column(String, unique=True)
    status = Column(String, default="pending")
    payment_status = Column(String, default="unpaid")
    delivery_status = Column(String, default="not_shipped")
    items = Column(JSONB, default=[])
    subtotal = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    currency = Column(String, default="NGN")
    delivery_address = Column(Text)
    delivery_notes = Column(Text)
    notes = Column(Text)
    conversation_id = Column(UUID(as_uuid=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
