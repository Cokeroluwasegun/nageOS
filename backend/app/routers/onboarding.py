from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.supabase_client import supabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateBusinessRequest(BaseModel):
    user_id: str
    email: str
    business_name: str


class UpdateWhatsAppRequest(BaseModel):
    business_id: str
    phone_number_id: str
    wa_access_token: str
    wa_verify_token: str


class UpdateBusinessRequest(BaseModel):
    business_id: str
    name: str = None
    ai_greeting: str = None
    ai_enabled: bool = None


@router.post("/create-business")
async def create_business(req: CreateBusinessRequest):
    """Called after Supabase signup to create business + user record."""
    try:
        # Create business
        biz_result = supabase.table("businesses").insert({
            "name": req.business_name,
            "plan": "trial",
            "ai_enabled": True,
            "ai_greeting": f"Hi! Welcome to {req.business_name}. How can I help you today?",
            "escalation_threshold": 0.7,
        }).execute()

        if not biz_result.data:
            raise HTTPException(status_code=400, detail="Failed to create business")

        business = biz_result.data[0]
        business_id = business["id"]

        # Create user record linked to business
        supabase.table("users").insert({
            "id": req.user_id,
            "business_id": business_id,
            "email": req.email,
            "role": "owner",
        }).execute()

        # Create default automation rules
        default_rules = [
            {
                "business_id": business_id,
                "name": "Abandoned chat follow-up",
                "trigger_type": "abandoned_chat",
                "delay_minutes": 120,
                "action_type": "send_message",
                "message_template": "Hi! We noticed you reached out earlier. How can we help you today?",
                "is_active": True,
            },
            {
                "business_id": business_id,
                "name": "Unpaid invoice reminder",
                "trigger_type": "unpaid_invoice",
                "delay_minutes": 1440,
                "action_type": "send_message",
                "message_template": "Hi! Just a reminder that your payment is still pending. Please complete your payment so we can process your order.",
                "is_active": True,
            },
        ]
        supabase.table("automation_rules").insert(default_rules).execute()

        logger.info(f"Business created: {business_id} for user {req.user_id}")
        return {"status": "ok", "business_id": business_id}

    except Exception as e:
        logger.error(f"Business creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect-whatsapp")
async def connect_whatsapp(req: UpdateWhatsAppRequest):
    """Save WhatsApp credentials for a business."""
    try:
        supabase.table("businesses").update({
            "phone_number_id": req.phone_number_id,
            "wa_access_token": req.wa_access_token,
            "wa_verify_token": req.wa_verify_token,
        }).eq("id", req.business_id).execute()

        return {"status": "ok", "message": "WhatsApp connected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/business/{user_id}")
async def get_user_business(user_id: str):
    """Get the business associated with a user."""
    user_result = supabase.table("users").select(
        "*, businesses(*)"
    ).eq("id", user_id).limit(1).execute()

    if not user_result.data:
        return {"status": "no_business", "business": None}

    user = user_result.data[0]
    return {"status": "ok", "business": user.get("businesses")}


@router.patch("/update-business")
async def update_business(req: UpdateBusinessRequest):
    """Update business settings."""
    data = {}
    if req.name is not None:
        data["name"] = req.name
    if req.ai_greeting is not None:
        data["ai_greeting"] = req.ai_greeting
    if req.ai_enabled is not None:
        data["ai_enabled"] = req.ai_enabled

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("businesses").update(data).eq(
        "id", req.business_id
    ).execute()

    return {"status": "ok", "business": result.data[0] if result.data else {}}