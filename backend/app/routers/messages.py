from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.supabase_client import supabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/business/{business_id}")
async def get_conversations(business_id: str):
    result = supabase.table("conversations").select(
        "*, customers(id, name, wa_phone, tags, total_spent)"
    ).eq("business_id", business_id).order(
        "last_message_at", desc=True
    ).execute()
    return {"status": "ok", "conversations": result.data or []}


@router.get("/{conversation_id}/messages")
async def get_messages(conversation_id: str):
    result = supabase.table("messages").select("*").eq(
        "conversation_id", conversation_id
    ).order("sent_at", desc=False).execute()
    return {"status": "ok", "messages": result.data or []}


@router.post("/{conversation_id}/reply")
async def send_reply(conversation_id: str, body: dict):
    content = body.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content required")

    conv_result = supabase.table("conversations").select(
        "*, businesses(phone_number_id, wa_access_token, name)"
    ).eq("id", conversation_id).limit(1).execute()

    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation = conv_result.data[0]
    business_id = conversation["business_id"]
    customer_id = conversation["customer_id"]

    customer_result = supabase.table("customers").select(
        "wa_phone, name"
    ).eq("id", customer_id).limit(1).execute()

    if not customer_result.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = customer_result.data[0]
    business = conversation.get("businesses", {})

    supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "business_id": business_id,
        "direction": "outbound",
        "sender_type": "agent",
        "content": content,
        "message_type": "text",
    }).execute()

    supabase.table("conversations").update({
        "last_message_preview": content[:100],
        "status": "open",
    }).eq("id", conversation_id).execute()

    from app.services.whatsapp import send_whatsapp_message
    result = await send_whatsapp_message(
        phone=customer["wa_phone"],
        message=content,
        phone_number_id=business.get("phone_number_id"),
        access_token=business.get("wa_access_token"),
    )

    return {"status": "ok", "sent": result}


@router.patch("/{conversation_id}/pause-ai")
async def toggle_ai(conversation_id: str, body: dict):
    paused = body.get("paused", True)
    supabase.table("conversations").update(
        {"ai_paused": paused}
    ).eq("id", conversation_id).execute()
    return {"status": "ok", "ai_paused": paused}