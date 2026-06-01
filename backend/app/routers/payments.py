import hashlib
import hmac
import json
from fastapi import APIRouter, Request, HTTPException
from app.config import get_settings
from app.supabase_client import supabase
from app.services.payments import (
    verify_paystack_payment,
    verify_flutterwave_payment,
    process_verified_payment,
)
from app.services.whatsapp import send_receipt_message
import logging

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


@router.post("/paystack/webhook")
async def paystack_webhook(request: Request):
    """Receive and process Paystack payment events."""
    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    # Verify Paystack signature
    if settings.paystack_secret_key:
        expected = hmac.new(
            settings.paystack_secret_key.encode(),
            body,
            hashlib.sha512,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(body)
    event = data.get("event", "")
    logger.info(f"Paystack event: {event}")

    if event != "charge.success":
        return {"status": "ignored"}

    reference = data["data"]["reference"]
    result = await verify_paystack_payment(reference)

    if not result["verified"]:
        return {"status": "not_verified"}

    # Find order by reference
    order_result = supabase.table("orders").select(
        "*, customers(wa_phone, name)"
    ).eq("id", reference).limit(1).execute()

    if not order_result.data:
        order_result = supabase.table("orders").select(
            "*, customers(wa_phone, name)"
        ).ilike("notes", f"%{reference}%").limit(1).execute()

    if not order_result.data:
        logger.warning(f"No order found for reference: {reference}")
        return {"status": "order_not_found"}

    order = order_result.data[0]

    payment = await process_verified_payment(
        business_id=order["business_id"],
        order_id=order["id"],
        customer_id=order["customer_id"],
        provider="paystack",
        reference=reference,
        amount=result["amount"],
        currency=result["currency"],
        raw_response=result.get("raw", {}),
    )

    # Send WhatsApp receipt
    customer = order.get("customers", {})
    if customer and customer.get("wa_phone"):
        biz_result = supabase.table("businesses").select(
            "phone_number_id, wa_access_token"
        ).eq("id", order["business_id"]).limit(1).execute()

        if biz_result.data:
            biz = biz_result.data[0]
            await send_receipt_message(
                phone=customer["wa_phone"],
                order_number=order["order_number"],
                amount=result["amount"],
                currency=result["currency"],
                phone_number_id=biz.get("phone_number_id"),
                access_token=biz.get("wa_access_token"),
            )

    return {"status": "ok", "payment": payment}


@router.post("/flutterwave/webhook")
async def flutterwave_webhook(request: Request):
    """Receive and process Flutterwave payment events."""
    body = await request.body()
    secret_hash = request.headers.get("verif-hash", "")

    if settings.flutterwave_secret_key and secret_hash != settings.flutterwave_secret_key:
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(body)
    event = data.get("event", "")
    logger.info(f"Flutterwave event: {event}")

    if event != "charge.completed":
        return {"status": "ignored"}

    transaction_id = str(data["data"]["id"])
    result = await verify_flutterwave_payment(transaction_id)

    if not result["verified"]:
        return {"status": "not_verified"}

    tx_ref = result["reference"]
    order_result = supabase.table("orders").select(
        "*, customers(wa_phone, name)"
    ).ilike("notes", f"%{tx_ref}%").limit(1).execute()

    if not order_result.data:
        logger.warning(f"No order found for tx_ref: {tx_ref}")
        return {"status": "order_not_found"}

    order = order_result.data[0]

    payment = await process_verified_payment(
        business_id=order["business_id"],
        order_id=order["id"],
        customer_id=order["customer_id"],
        provider="flutterwave",
        reference=tx_ref,
        amount=result["amount"],
        currency=result["currency"],
        raw_response=result.get("raw", {}),
    )

    customer = order.get("customers", {})
    if customer and customer.get("wa_phone"):
        biz_result = supabase.table("businesses").select(
            "phone_number_id, wa_access_token"
        ).eq("id", order["business_id"]).limit(1).execute()

        if biz_result.data:
            biz = biz_result.data[0]
            await send_receipt_message(
                phone=customer["wa_phone"],
                order_number=order["order_number"],
                amount=result["amount"],
                currency=result["currency"],
                phone_number_id=biz.get("phone_number_id"),
                access_token=biz.get("wa_access_token"),
            )

    return {"status": "ok", "payment": payment}


@router.get("/order/{order_id}")
async def get_order_payments(order_id: str):
    """Get all payments for an order."""
    result = supabase.table("payments").select("*").eq(
        "order_id", order_id
    ).execute()
    return {"status": "ok", "payments": result.data or []}