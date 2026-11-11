# Tests always run in development mode, independent of the local production .env.
import os

os.environ.update({
    "SPLV_ENV": "development",
    "SPLV_ADMIN_API": "true",
    "SPLV_TRUST_PROXY": "false",
    "SPLV_JWT_SECRET": "test-secret-for-pytest-only-0123456789abcdef",
    "SPLV_ADMIN_KEY": "test-admin-key-for-pytest-only",
    "SPLV_DATABASE_URL": "sqlite://",
    "SPLV_CORS_ORIGINS": "http://localhost:5173",
})
