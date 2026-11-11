from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-secret-change-me-in-production-0123456789"
DEV_ADMIN_KEY = "dev-admin-key-change-me"


class Settings(BaseSettings):
    """Server configuration. Override with environment variables or a .env file.

    Create a production .env with:  python -m scripts.init_env
    """

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SPLV_")

    env: str = "development"  # "production" when exposed to the internet
    database_url: str = "sqlite:///./splv.db"
    jwt_secret: str = DEV_JWT_SECRET
    admin_key: str = DEV_ADMIN_KEY
    admin_api: bool = True  # HTTP admin endpoints; disable in production (use scripts instead)
    trust_proxy: bool = False  # true behind Cloudflare/NGINX so rate limits see the real client IP
    student_token_days: int = 180
    teacher_token_hours: int = 12
    cors_origins: str = "http://localhost:5173,capacitor://localhost,http://localhost,https://localhost"
    max_body_bytes: int = 1_000_000
    max_event_payload_bytes: int = 4_000
    content_version: str = "2026.11.1"
    min_app_version: str = "1.0.0"

    @property
    def production(self) -> bool:
        return self.env.lower() == "production"


def check_production(s: Settings) -> None:
    """Refuse to start an internet-facing server with development secrets."""
    if not s.production:
        return
    problems = []
    if s.jwt_secret == DEV_JWT_SECRET or len(s.jwt_secret) < 32:
        problems.append("SPLV_JWT_SECRET masih default/pendek")
    if s.admin_api and (s.admin_key == DEV_ADMIN_KEY or len(s.admin_key) < 24):
        problems.append("SPLV_ADMIN_KEY masih default/pendek")
    if problems:
        raise RuntimeError("Mode produksi ditolak: " + "; ".join(problems) + ". Jalankan: python -m scripts.init_env")


settings = Settings()
