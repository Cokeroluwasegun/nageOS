import httpx
import json
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def call_ai(messages, model=None, max_tokens=500):
    model = model or settings.default_ai_model
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def classify_intent(message, context):
    prompt = f"""You are an AI for an African SME WhatsApp business.
Classify this customer message intent. Return ONLY valid JSON, nothing else.

Customer: {context.get("customer_name")}
Returning customer: {context.get("is_returning")}
Recent orders: {json.dumps(context.get("recent_orders", []))}
Message: "{message}"

Return exactly this JSON format:
{{"intent": "order_inquiry|payment_inquiry|new_order|complaint|general|escalate", "confidence": 0.95, "reason": "brief reason"}}"""

    try:
        raw = await call_ai(
            messages=[{"role": "user", "content": prompt}],
            model=settings.default_ai_model,
            max_tokens=150,
        )
        raw = raw.strip()
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            raw = raw[start:end]
        return json.loads(raw.strip())
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return {"intent": "general", "confidence": 0.5, "reason": "fallback"}


async def generate_reply(message, context, intent, business_name="our store", ai_greeting=None):
    orders_text = ""
    if context.get("recent_orders"):
        orders_text = "\n".join([
            f"- {o.get('order_number', 'N/A')}: status={o.get('status')} "
            f"payment={o.get('payment_status')} "
            f"delivery={o.get('delivery_status')} "
            f"amount=NGN{o.get('total_amount', 0):,.0f}"
            for o in context["recent_orders"]
        ])
    else:
        orders_text = "No orders yet"

    history_text = ""
    if context.get("recent_messages"):
        history_text = "\n".join([
            f"{m.get('sender_type', 'unknown').upper()}: {m.get('content', '')}"
            for m in context["recent_messages"][-4:]
        ])
    else:
        history_text = "New conversation"

    system_prompt = f"""You are a helpful WhatsApp customer service assistant for {business_name}, a Nigerian SME.
Be warm, friendly, and concise. Write short replies suitable for WhatsApp.
Use simple English. Be professional but not stiff.

Customer name: {context.get("customer_name", "Customer")}
Returning customer: {context.get("is_returning", False)}
Total spent: NGN {context.get("total_spent", 0):,.0f}
Tags: {", ".join(context.get("tags", [])) or "none"}

Customer orders:
{orders_text}

Recent conversation:
{history_text}

Detected intent: {intent}

Guidelines:
- order_inquiry: give specific order status from the data above
- payment_inquiry: confirm based on payment_status in orders
- new_order: warmly ask what they want to order
- complaint: apologise sincerely and offer a solution
- general: respond warmly and helpfully
- Never invent order numbers, prices, or delivery dates
- Keep reply under 100 words
- Do not use markdown formatting"""

    try:
        reply = await call_ai(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            max_tokens=300,
        )
        return reply.strip()
    except Exception as e:
        logger.error(f"Reply generation failed: {e}")
        return (
            f"Hi {context.get('customer_name', 'there')}! "
            f"Thanks for reaching out to {business_name}. "
            f"We received your message and will get back to you shortly."
        )
