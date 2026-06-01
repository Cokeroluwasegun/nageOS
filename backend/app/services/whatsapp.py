import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
WA_API_URL = "https://graph.facebook.com/v19.0"


async def send_whatsapp_message(phone, message, phone_number_id=None, access_token=None):
    pid = phone_number_id or settings.wa_phone_number_id
    token = access_token or settings.wa_access_token
    if not pid or not token:
        logger.warning("WhatsApp credentials not configured")
        return {"status": "skipped", "reason": "no_credentials"}
    url = f"{WA_API_URL}/{pid}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return {"status": "sent", "data": response.json()}
        except httpx.HTTPStatusError as e:
            logger.error(f"WhatsApp API error: {e.response.text}")
            return {"status": "error", "detail": e.response.text}
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return {"status": "error", "detail": str(e)}


async def send_receipt_message(phone, order_number, amount, currency="NGN", phone_number_id=None, access_token=None):
    message = (
        f"Payment Confirmed!\n\n"
        f"Thank you! We have received your payment.\n\n"
        f"Order: {order_number}\n"
        f"Amount: {currency} {amount:,.2f}\n\n"
        f"We will update you as soon as your order is processed!"
    )
    return await send_whatsapp_message(phone, message, phone_number_id, access_token)
