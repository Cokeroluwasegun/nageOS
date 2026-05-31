from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_env: str = "development"
    secret_key: str = "dev-secret-key"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    # WhatsApp
    wa_phone_number_id: str = ""
    wa_access_token: str = ""
    wa_verify_token: str = "nageos-webhook-verify-token-2024"
    wa_app_secret: str = ""

    # AI
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_ai_model: str = "anthropic/claude-sonnet-4-5"

    # Payments
    paystack_secret_key: str = ""
    flutterwave_secret_key: str = ""

    # Sentry
    sentry_dsn: str = ""

    # Admin
    admin_email: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()