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


@router.post("/{order_id}/invoice")
async def generate_invoice(order_id: str):
    """Generate a payment link for an order and send via WhatsApp."""
    from app.services.payments import generate_paystack_payment_link
    from app.services.whatsapp import send_whatsapp_message

    order_result = supabase.table("orders").select(
        "*, customers(name, wa_phone, email), businesses(name, phone_number_id, wa_access_token)"
    ).eq("id", order_id).limit(1).execute()

    if not order_result.data:
        raise HTTPException(status_code=404, detail="Order not found")

    order = order_result.data[0]
    customer = order.get("customers", {})
    business = order.get("businesses", {})

    if not customer.get("email"):
        customer_email = f"{customer.get('wa_phone', 'customer')}@nageos.io"
    else:
        customer_email = customer["email"]

    payment_result = await generate_paystack_payment_link(
        amount=float(order["total_amount"]),
        email=customer_email,
        order_id=order_id,
        order_number=order["order_number"],
        business_name=business.get("name", "NageOS Business"),
    )

    if payment_result["status"] != "ok":
        raise HTTPException(status_code=400, detail="Failed to generate payment link")

    payment_url = payment_result["payment_url"]

    # Format invoice message
    items_text = ""
    if isinstance(order.get("items"), list):
        items_text = "\n".join([
            f"• {item.get('name')} x{item.get('qty', 1)} — ₦{item.get('price', 0):,.0f}"
            for item in order["items"]
        ])

    message = (
        f"Hi {customer.get('name', 'there')}! Here is your invoice from {business.get('name', 'us')}.\n\n"
        f"*Order:* {order['order_number']}\n"
        f"*Items:*\n{items_text}\n\n"
        f"*Total: ₦{float(order['total_amount']):,.0f}*\n\n"
        f"Pay securely here:\n{payment_url}\n\n"
        f"Payment is confirmed automatically once complete."
    )

    await send_whatsapp_message(
        phone=customer.get("wa_phone"),
        message=message,
        phone_number_id=business.get("phone_number_id"),
        access_token=business.get("wa_access_token"),
    )

    supabase.table("orders").update({
        "payment_status": "pending_verification"
    }).eq("id", order_id).execute()

    return {
        "status": "ok",
        "payment_url": payment_url,
        "message_sent": True,
    }