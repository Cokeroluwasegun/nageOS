import logging
from app.supabase_client import supabase

logger = logging.getLogger(__name__)


def create_order(
    business_id: str,
    customer_id: str,
    items: list,
    total_amount: float,
    delivery_address: str = None,
    notes: str = None,
    conversation_id: str = None,
    currency: str = "NGN",
) -> dict:
    """Create a new order for a customer."""
    subtotal = sum(
        item.get("price", 0) * item.get("qty", 1)
        for item in items
    ) or total_amount

    data = {
        "business_id": business_id,
        "customer_id": customer_id,
        "items": items,
        "subtotal": subtotal,
        "total_amount": total_amount,
        "currency": currency,
        "status": "pending",
        "payment_status": "unpaid",
        "delivery_status": "not_shipped",
    }

    if delivery_address:
        data["delivery_address"] = delivery_address
    if notes:
        data["notes"] = notes
    if conversation_id:
        data["conversation_id"] = conversation_id

    result = supabase.table("orders").insert(data).execute()
    order = result.data[0]

    # Update customer order count
    supabase.rpc("increment_order_count", {
        "customer_id": customer_id
    }).execute()

    logger.info(f"Order created: {order['order_number']}")
    return order


def get_order(order_id: str = None, order_number: str = None, business_id: str = None) -> dict | None:
    """Get an order by ID or order number."""
    if order_id:
        result = supabase.table("orders").select("*").eq(
            "id", order_id
        ).limit(1).execute()
    elif order_number:
        query = supabase.table("orders").select("*").eq("order_number", order_number)
        if business_id:
            query = query.eq("business_id", business_id)
        result = query.limit(1).execute()
    else:
        return None

    return result.data[0] if result.data else None


def get_customer_orders(customer_id: str, business_id: str, limit: int = 10) -> list:
    """Get all orders for a customer."""
    result = supabase.table("orders").select("*").eq(
        "customer_id", customer_id
    ).eq(
        "business_id", business_id
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def get_business_orders(
    business_id: str,
    status: str = None,
    payment_status: str = None,
    limit: int = 50,
) -> list:
    """Get all orders for a business with optional filters."""
    query = supabase.table("orders").select(
        "*, customers(name, wa_phone)"
    ).eq("business_id", business_id)

    if status:
        query = query.eq("status", status)
    if payment_status:
        query = query.eq("payment_status", payment_status)

    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def update_order_status(
    order_id: str,
    status: str = None,
    payment_status: str = None,
    delivery_status: str = None,
) -> dict:
    """Update order status fields."""
    data = {}
    if status:
        data["status"] = status
    if payment_status:
        data["payment_status"] = payment_status
    if delivery_status:
        data["delivery_status"] = delivery_status

    if not data:
        return {}

    result = supabase.table("orders").update(data).eq(
        "id", order_id
    ).execute()
    return result.data[0] if result.data else {}


def get_order_by_customer_phone(wa_phone: str, business_id: str) -> dict | None:
    """Find most recent order for a customer by phone number."""
    customer_result = supabase.table("customers").select("id").eq(
        "wa_phone", wa_phone
    ).eq("business_id", business_id).limit(1).execute()

    if not customer_result.data:
        return None

    customer_id = customer_result.data[0]["id"]
    orders = get_customer_orders(customer_id, business_id, limit=1)
    return orders[0] if orders else None