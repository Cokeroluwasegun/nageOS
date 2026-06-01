from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import webhooks

settings = get_settings()

app = FastAPI(
    title="NageOS API",
    description="AI WhatsApp Operations OS for African SMEs",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(webhooks.router, prefix="/webhook", tags=["WhatsApp"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": "NageOS",
        "env": settings.app_env,
        "supabase": settings.supabase_url != "",
        "ai": settings.openrouter_api_key != "",
    }
