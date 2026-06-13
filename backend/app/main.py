from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import (
    webhooks, orders, customers,
    payments, messages, onboarding,
    products, broadcast
)

settings = get_settings()

app = FastAPI(
    title="NageOS API",
    description="AI WhatsApp Operations OS for African SMEs",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://nageos.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks.router,   prefix="/webhook",     tags=["WhatsApp"])
app.include_router(messages.router,   prefix="/conversations", tags=["Conversations"])
app.include_router(orders.router,     prefix="/orders",      tags=["Orders"])
app.include_router(customers.router,  prefix="/customers",   tags=["Customers"])
app.include_router(payments.router,   prefix="/payments",    tags=["Payments"])
app.include_router(onboarding.router, prefix="/onboarding",  tags=["Onboarding"])
app.include_router(products.router,   prefix="/products",    tags=["Products"])
app.include_router(broadcast.router,  prefix="/broadcast",   tags=["Broadcast"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": "NageOS",
        "version": "0.2.0",
        "env": settings.app_env,
        "supabase": settings.supabase_url != "",
        "ai": settings.openrouter_api_key != "",
    }