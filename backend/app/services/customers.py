import logging
from app.supabase_client import supabase

logger = logging.getLogger(__name__)


def lookup_customer(wa_phone: str, business_id: str):
    result = supabase.table("customers").select("*").eq(
        "wa_phone", wa_phone
    ).eq("business_id", business_id).limit(1).execute()
    return result.data[0] if result.data else None


def upsert_customer(wa_phone: str, business_id: str, name: str = None):
    customer = lookup_customer(wa_phone, business_id)
    if customer:
        if name and customer.get("name") != name:
            supabase.table("customers").update(
                {"name": name}
            ).eq("id", customer["id"]).execute()
            customer["name"] = name
        logger.info(f"Existing customer: {customer['id']}")
        return customer
    data = {
        "business_id": business_id,
        "wa_phone": wa_phone,
        "name": name or wa_phone,
        "tags": [],
        "total_spent": 0,
        "order_count": 0,
    }
    result = supabase.table("customers").insert(data).execute()
    customer = result.data[0]
    logger.info(f"New customer: {customer['id']}")
    return customer


def get_or_create_conversation(customer: dict, business_id: str):
    result = supabase.table("conversations").select("*").eq(
        "customer_id", customer["id"]
    ).eq("business_id", business_id).in_(
        "status", ["open", "ai_handling", "escalated"]
    ).order("last_message_at", desc=True).limit(1).execute()

    if result.data:
        return result.data[0]

    data = {
        "business_id": business_id,
        "customer_id": customer["id"],
        "status": "ai_handling",
        "unread_count": 0,
    }
    result = supabase.table("conversations").insert(data).execute()
    return result.data[0]


def get_customer_context(customer: dict, business_id: str) -> dict:
    orders_result = supabase.table("orders").select("*").eq(
        "customer_id", customer["id"]
    ).eq("business_id", business_id).order(
        "created_at", desc=True
    ).limit(5).execute()
    orders = orders_result.data or []

    conv_result = supabase.table("conversations").select("*").eq(
        "customer_id", customer["id"]
    ).eq("business_id", business_id).order(
        "last_message_at", desc=True
    ).limit(1).execute()

    recent_messages = []
    if conv_result.data:
        conv_id = conv_result.data[0]["id"]
        msgs_result = supabase.table("messages").select("*").eq(
            "conversation_id", conv_id
        ).order("sent_at", desc=True).limit(10).execute()
        recent_messages = list(reversed(msgs_result.data or []))

    return {
        "customer_name": customer.get("name") or "Customer",
        "wa_phone": customer["wa_phone"],
        "total_spent": float(customer.get("total_spent") or 0),
        "order_count": customer.get("order_count") or 0,
        "tags": customer.get("tags") or [],
        "is_returning": (customer.get("order_count") or 0) > 0,
        "recent_orders": [
            {
                "order_number": o.get("order_number"),
                "status": o.get("status"),
                "payment_status": o.get("payment_status"),
                "delivery_status": o.get("delivery_status"),
                "total_amount": float(o.get("total_amount") or 0),
                "items": o.get("items", []),
            }
            for o in orders
        ],
        "recent_messages": [
            {
                "direction": m.get("direction"),
                "content": m.get("content"),
                "sender_type": m.get("sender_type"),
            }
            for m in recent_messages[-6:]
        ],
    }
