import json
import logging
import hashlib
import hmac
from fastapi import APIRouter, Request, HTTPException, Query

from app.config import get_settings
from app.supabase_client import supabase
from app.services.customers import (
    upsert_customer,
    get_or_create_conversation,
    get_customer_context,
)
from app.services.whatsapp import send_whatsapp_message
from app.services.ai import classify_intent, generate_reply

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


def verify_signature(payload: bytes, signature: str) -> bool:
    if not settings.wa_app_secret:
        return True
    expected = hmac.new(
        settings.wa_app_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.wa_verify_token:
        logger.info("WhatsApp webhook verified")
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("")
async def receive_message(request: Request):
    signature = request.headers.get("X-Hub-Signature-256", "")
    body = await request.body()

    if not verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(body)

    try:
        entry = data["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]

        if "messages" not in value:
            return {"status": "ignored"}

        message_data = value["messages"][0]
        contact = value["contacts"][0]
        wa_business_id = value["metadata"]["phone_number_id"]

        phone = message_data["from"]
        name = contact["profile"]["name"]
        msg_type = message_data["type"]
        wa_message_id = message_data["id"]

        if msg_type == "text":
            text = message_data["text"]["body"]
        elif msg_type == "image":
            text = "[Customer sent an image]"
        elif msg_type == "audio":
            text = "[Customer sent a voice note]"
        else:
            text = f"[Customer sent {msg_type}]"

        logger.info(f"Inbound from {name} ({phone}): {text}")

        # Find business using Supabase client
        biz_result = supabase.table("businesses").select("*").eq(
            "phone_number_id", wa_business_id
        ).limit(1).execute()

        if not biz_result.data:
            biz_result = supabase.table("businesses").select("*").limit(1).execute()

        if not biz_result.data:
            return {"status": "error", "detail": "business_not_found"}

        business = biz_result.data[0]
        business_id = business["id"]

        # Upsert customer
        customer = upsert_customer(phone, business_id, name)

        # Get or create conversation
        conversation = get_or_create_conversation(customer, business_id)
        conversation_id = conversation["id"]

        # Store inbound message
        supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "business_id": business_id,
            "wa_message_id": wa_message_id,
            "direction": "inbound",
            "sender_type": "customer",
            "content": text,
            "message_type": msg_type,
        }).execute()

        # Update conversation
        supabase.table("conversations").update({
            "last_message_preview": text[:100],
            "unread_count": (conversation.get("unread_count") or 0) + 1,
            "status": "ai_handling",
        }).eq("id", conversation_id).execute()

        # Check if AI is paused
        if conversation.get("ai_paused") or not business.get("ai_enabled"):
            return {"status": "received", "ai": "paused"}

        # Build context and classify intent
        context = get_customer_context(customer, business_id)
        intent_result = await classify_intent(text, context)
        intent = intent_result.get("intent", "general")
        confidence = intent_result.get("confidence", 0.5)

        logger.info(f"Intent: {intent} ({confidence})")

        # Escalate if needed
        threshold = business.get("escalation_threshold") or 0.7
        if confidence < threshold or intent == "escalate":
            supabase.table("conversations").update(
                {"status": "escalated"}
            ).eq("id", conversation_id).execute()
            holding = (
                f"Hi {name}! Thanks for reaching out to "
                f"{business['name']}. Let me connect you with "
                f"our team right away. Please hold on."
            )
            await send_whatsapp_message(
                phone, holding,
                business.get("phone_number_id"),
                business.get("wa_access_token"),
            )
            return {"status": "escalated"}

        # Generate AI reply
        reply_text = await generate_reply(
            message=text,
            context=context,
            intent=intent,
            business_name=business["name"],
            ai_greeting=business.get("ai_greeting"),
        )

        # Store outbound message
        supabase.table("messages").insert({
            "conversation_id": conversation_id,
            "business_id": business_id,
            "direction": "outbound",
            "sender_type": "ai",
            "content": reply_text,
            "message_type": "text",
            "ai_intent": intent,
            "ai_confidence": confidence,
        }).execute()

        # Send reply
        result = await send_whatsapp_message(
            phone, reply_text,
            business.get("phone_number_id"),
            business.get("wa_access_token"),
        )

        return {
            "status": "ok",
            "intent": intent,
            "confidence": confidence,
            "reply_sent": result.get("status") == "sent",
        }

    except (KeyError, IndexError) as e:
        logger.warning(f"Could not parse webhook: {e}")
        return {"status": "ignored"}
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}