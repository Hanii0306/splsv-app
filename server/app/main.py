from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .config import check_production, settings
from .db import init_db
from .download import router as download_router
from .hardening import SecurityMiddleware
from .routes import router

STATIC_DIR = Path(__file__).parent / "static"

check_production(settings)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


# No interactive API docs on an internet-facing server.
docs = {} if not settings.production else {"docs_url": None, "redoc_url": None, "openapi_url": None}
app = FastAPI(title="SPLV app API", version="1.0.0", lifespan=lifespan, **docs)

app.add_middleware(SecurityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)
app.include_router(router)
app.include_router(download_router)
app.mount("/dashboard", StaticFiles(directory=STATIC_DIR / "dashboard", html=True), name="dashboard")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/download")


@app.get("/health")
def health():
    return {"ok": True}
