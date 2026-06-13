import httpx
import logging
from app.supabase_client import supabase
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def verify_paystack_payment(reference: str) -> dict:
    """Verify a Paystack payment by reference."""
    url = f"https://api.paystack.co/transaction/verify/{reference}"
    headers = {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("status") and data["data"]["status"] == "success":
                return {
                    "verified": True,
                    "amount": data["data"]["amount"] / 100,
                    "currency": data["data"]["currency"],
                    "reference": reference,
                    "provider": "paystack",
                    "raw": data["data"],
                }
            return {"verified": False, "reason": "payment_not_successful"}
        except Exception as e:
            logger.error(f"Paystack verification failed: {e}")
            return {"verified": False, "reason": str(e)}


async def verify_flutterwave_payment(transaction_id: str) -> dict:
    """Verify a Flutterwave payment by transaction ID."""
    url = f"https://api.flutterwave.com/v3/transactions/{transaction_id}/verify"
    headers = {
        "Authorization": f"Bearer {settings.flutterwave_secret_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "success" and data["data"]["status"] == "successful":
                return {
                    "verified": True,
                    "amount": data["data"]["amount"],
                    "currency": data["data"]["currency"],
                    "reference": data["data"]["tx_ref"],
                    "provider": "flutterwave",
                    "raw": data["data"],
                }
            return {"verified": False, "reason": "payment_not_successful"}
        except Exception as e:
            logger.error(f"Flutterwave verification failed: {e}")
            return {"verified": False, "reason": str(e)}


async def process_verified_payment(
    business_id: str,
    order_id: str,
    customer_id: str,
    provider: str,
    reference: str,
    amount: float,
    currency: str,
    raw_response: dict,
) -> dict:
    """
    After payment is verified:
    1. Store payment record
    2. Update order to paid
    3. Update customer total_spent
    """
    # Store payment
    payment_result = supabase.table("payments").insert({
        "business_id": business_id,
        "order_id": order_id,
        "customer_id": customer_id,
        "provider": provider,
        "reference": reference,
        "amount": amount,
        "currency": currency,
        "status": "verified",
        "provider_response": raw_response,
    }).execute()

    payment = payment_result.data[0]

    # Update order payment status
    supabase.table("orders").update({
        "payment_status": "paid",
        "status": "confirmed",
    }).eq("id", order_id).execute()

    # Update customer total_spent
    customer_result = supabase.table("customers").select(
        "total_spent"
    ).eq("id", customer_id).execute()

    if customer_result.data:
        current_spent = float(
            customer_result.data[0].get("total_spent") or 0
        )
        supabase.table("customers").update({
            "total_spent": current_spent + amount
        }).eq("id", customer_id).execute()

    logger.info(f"Payment processed: {reference} — {currency} {amount}")
    return payment


async def generate_paystack_payment_link(
    amount: float,
    email: str,
    order_id: str,
    order_number: str,
    business_name: str,
) -> dict:
    """Generate a Paystack payment link for an order."""
    url = "https://api.paystack.co/transaction/initialize"
    headers = {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "email": email,
        "amount": int(amount * 100),  # Paystack uses kobo
        "reference": order_id,
        "metadata": {
            "order_number": order_number,
            "business_name": business_name,
        },
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("status"):
                return {
                    "status": "ok",
                    "payment_url": data["data"]["authorization_url"],
                    "reference": data["data"]["reference"],
                }
            return {"status": "error", "detail": data.get("message")}
        except Exception as e:
            logger.error(f"Paystack link generation failed: {e}")
            return {"status": "error", "detail": str(e)}    