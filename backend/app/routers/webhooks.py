from fastapi import APIRouter, Request, HTTPException, Query
from app.config import get_settings
import hashlib, hmac, json, logging

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify Meta webhook signature."""
    if not settings.wa_app_secret:
        return True  # Skip in dev if secret not set
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
    """Meta webhook verification challenge."""
    if hub_mode == "subscribe" and hub_verify_token == settings.wa_verify_token:
        logger.info("WhatsApp webhook verified successfully")
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("")
async def receive_message(request: Request):
    """Receive inbound WhatsApp messages."""
    signature = request.headers.get("X-Hub-Signature-256", "")
    body = await request.body()

    if not verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(body)
    logger.info(f"Webhook received: {json.dumps(data, indent=2)}")

    # Extract message from payload
    try:
        entry = data["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]

        if "messages" not in value:
            return {"status": "no_message"}  # Status update, not a message

        message = value["messages"][0]
        contact = value["contacts"][0]

        phone = message["from"]
        name = contact["profile"]["name"]
        msg_type = message["type"]
        msg_id = message["id"]

        text = ""
        if msg_type == "text":
            text = message["text"]["body"]
        elif msg_type == "image":
            text = "[Image received]"
        elif msg_type == "audio":
            text = "[Voice note received]"
        else:
            text = f"[{msg_type} received]"

        logger.info(f"Message from {name} ({phone}): {text}")

        # TODO Phase 3: route to message processing pipeline
        # For now just acknowledge
        return {"status": "received", "from": phone, "message": text}

    except (KeyError, IndexError) as e:
        logger.warning(f"Could not parse webhook payload: {e}")
        return {"status": "ignored"}