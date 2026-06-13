from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.supabase_client import supabase
from app.services.whatsapp import send_whatsapp_message
import logging
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)


class BroadcastRequest(BaseModel):
    business_id: str
    message: str
    target: str = 'all'
    tag_filter: Optional[str] = None


@router.post("/send")
async def send_broadcast(req: BroadcastRequest):
    """Send a broadcast message to customers."""
    # Check feature flag
    flag_result = supabase.table("feature_flags").select("enabled").eq(
        "business_id", req.business_id
    ).eq("feature_name", "broadcast").execute()

    if not flag_result.data or not flag_result.data[0].get("enabled"):
        raise HTTPException(
            status_code=403,
            detail="Broadcast messaging is not enabled for your plan"
        )

    # Get business credentials
    biz_result = supabase.table("businesses").select(
        "name, phone_number_id, wa_access_token"
    ).eq("id", req.business_id).limit(1).execute()

    if not biz_result.data:
        raise HTTPException(status_code=404, detail="Business not found")

    business = biz_result.data[0]

    # Get target customers
    query = supabase.table("customers").select(
        "id, wa_phone, name, tags"
    ).eq("business_id", req.business_id)

    if req.target == 'tag' and req.tag_filter:
        result = query.execute()
        customers = [
            c for c in (result.data or [])
            if req.tag_filter in (c.get("tags") or [])
        ]
    elif req.target == 'vip':
        result = query.execute()
        customers = [
            c for c in (result.data or [])
            if float(c.get("total_spent") or 0) > 50000
        ]
    else:
        result = query.execute()
        customers = result.data or []

    if not customers:
        return {"status": "ok", "sent": 0, "message": "No customers found"}

    # Send messages with rate limiting
    sent = 0
    failed = 0
    results = []

    for customer in customers:
        phone = customer.get("wa_phone")
        name = customer.get("name") or "there"
        if not phone:
            continue

        personalised = req.message.replace("{name}", name)

        result = await send_whatsapp_message(
            phone=phone,
            message=personalised,
            phone_number_id=business.get("phone_number_id"),
            access_token=business.get("wa_access_token"),
        )

        if result.get("status") == "sent":
            sent += 1
        else:
            failed += 1

        results.append({
            "phone": phone,
            "name": name,
            "status": result.get("status"),
        })

        # Rate limit: 1 message per second to avoid Meta limits
        await asyncio.sleep(1)

    # Log broadcast
    supabase.table("messages").insert({
        "conversation_id": None,
        "business_id": req.business_id,
        "direction": "outbound",
        "sender_type": "agent",
        "content": f"[BROADCAST] {req.message[:100]}...",
        "message_type": "text",
    }).execute()

    logger.info(f"Broadcast sent: {sent} success, {failed} failed")

    return {
        "status": "ok",
        "sent": sent,
        "failed": failed,
        "total": len(customers),
    }


@router.get("/stats/{business_id}")
async def get_broadcast_stats(business_id: str):
    """Get broadcast statistics for a business."""
    result = supabase.table("customers").select(
        "tags, total_spent"
    ).eq("business_id", business_id).execute()

    customers = result.data or []
    total = len(customers)
    vip = len([c for c in customers if float(c.get("total_spent") or 0) > 50000])

    all_tags: dict = {}
    for c in customers:
        for tag in (c.get("tags") or []):
            all_tags[tag] = all_tags.get(tag, 0) + 1

    return {
        "status": "ok",
        "total_customers": total,
        "vip_customers": vip,
        "tags": all_tags,
    }