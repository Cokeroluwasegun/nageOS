from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.supabase_client import supabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateBusinessRequest(BaseModel):
    user_id: str
    email: str
    business_name: str
    business_type: str = 'fashion'


class UpdateBusinessRequest(BaseModel):
    business_id: str
    name: Optional[str] = None
    ai_greeting: Optional[str] = None
    ai_enabled: Optional[bool] = None
    business_type: Optional[str] = None


class ConnectWhatsAppRequest(BaseModel):
    business_id: str
    phone_number_id: str
    wa_access_token: str
    wa_verify_token: str


@router.post("/create-business")
async def create_business(req: CreateBusinessRequest):
    """Called after signup to create business + user record instantly."""
    try:
        # Get the shared NageOS number from settings
        settings_result = supabase.table("businesses").select(
            "phone_number_id, wa_access_token"
        ).eq("id", "a0000000-0000-0000-0000-000000000001").execute()

        shared_phone_id = None
        shared_token = None
        if settings_result.data:
            shared_phone_id = settings_result.data[0].get("phone_number_id")
            shared_token = settings_result.data[0].get("wa_access_token")

        # Create business — instantly usable
        biz_result = supabase.table("businesses").insert({
            "name": req.business_name,
            "business_type": req.business_type,
            "plan": "trial",
            "ai_enabled": True,
            "onboarding_complete": True,
            "ai_greeting": f"Hi! Welcome to {req.business_name}. How can I help you today?",
            "escalation_threshold": 0.7,
            # Use shared number by default
            "phone_number_id": shared_phone_id,
            "wa_access_token": shared_token,
        }).execute()

        if not biz_result.data:
            raise HTTPException(status_code=400, detail="Failed to create business")

        business = biz_result.data[0]
        business_id = business["id"]

        # Create user record
        supabase.table("users").insert({
            "id": req.user_id,
            "business_id": business_id,
            "email": req.email,
            "role": "owner",
        }).execute()

        # Create default automation rules
        supabase.table("automation_rules").insert([
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
        ]).execute()

        # Enable default features
        supabase.table("feature_flags").insert([
            {"business_id": business_id, "feature_name": "ai_replies", "enabled": True},
            {"business_id": business_id, "feature_name": "order_tracking", "enabled": True},
            {"business_id": business_id, "feature_name": "payment_verification", "enabled": True},
            {"business_id": business_id, "feature_name": "broadcast", "enabled": False},
        ]).execute()

        logger.info(f"Business created instantly: {business_id}")
        return {"status": "ok", "business_id": business_id}

    except Exception as e:
        logger.error(f"Business creation failed: {e}")
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
    if req.business_type is not None:
        data["business_type"] = req.business_type

    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("businesses").update(data).eq(
        "id", req.business_id
    ).execute()

    return {"status": "ok", "business": result.data[0] if result.data else {}}


@router.post("/connect-whatsapp")
async def connect_whatsapp(req: ConnectWhatsAppRequest):
    """Save dedicated WhatsApp credentials for a business (premium)."""
    try:
        supabase.table("businesses").update({
            "phone_number_id": req.phone_number_id,
            "wa_access_token": req.wa_access_token,
            "wa_verify_token": req.wa_verify_token,
        }).eq("id", req.business_id).execute()

        return {"status": "ok", "message": "WhatsApp connected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/features/{business_id}")
async def get_features(business_id: str):
    """Get feature flags for a business."""
    result = supabase.table("feature_flags").select("*").eq(
        "business_id", business_id
    ).execute()
    flags = {f["feature_name"]: f["enabled"] for f in (result.data or [])}
    return {"status": "ok", "features": flags}