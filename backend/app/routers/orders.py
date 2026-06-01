from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.orders import (
    create_order,
    get_order,
    get_business_orders,
    get_customer_orders,
    update_order_status,
)

router = APIRouter()


class CreateOrderRequest(BaseModel):
    business_id: str
    customer_id: str
    items: list
    total_amount: float
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    conversation_id: Optional[str] = None
    currency: str = "NGN"


class UpdateOrderRequest(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    delivery_status: Optional[str] = None


@router.post("")
async def create_new_order(req: CreateOrderRequest):
    """Create a new order."""
    try:
        order = create_order(
            business_id=req.business_id,
            customer_id=req.customer_id,
            items=req.items,
            total_amount=req.total_amount,
            delivery_address=req.delivery_address,
            notes=req.notes,
            conversation_id=req.conversation_id,
            currency=req.currency,
        )
        return {"status": "ok", "order": order}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/business/{business_id}")
async def list_orders(
    business_id: str,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
):
    """Get all orders for a business."""
    orders = get_business_orders(business_id, status, payment_status)
    return {"status": "ok", "orders": orders, "count": len(orders)}


@router.get("/{order_id}")
async def get_single_order(order_id: str):
    """Get a single order by ID."""
    order = get_order(order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "ok", "order": order}


@router.patch("/{order_id}")
async def update_order(order_id: str, req: UpdateOrderRequest):
    """Update order status."""
    order = update_order_status(
        order_id=order_id,
        status=req.status,
        payment_status=req.payment_status,
        delivery_status=req.delivery_status,
    )
    return {"status": "ok", "order": order}


@router.get("/customer/{customer_id}/business/{business_id}")
async def get_orders_for_customer(customer_id: str, business_id: str):
    """Get all orders for a specific customer."""
    orders = get_customer_orders(customer_id, business_id)
    return {"status": "ok", "orders": orders, "count": len(orders)}