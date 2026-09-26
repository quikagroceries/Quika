import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
import app.models  # noqa: F401  (register all tables)
from app.main import app


@pytest.fixture(autouse=True)
def _no_otp_resend_cooldown(monkeypatch):
    """Most tests log in repeatedly as the same number within a second; the
    real resend cooldown (which the OTP-delivery tests set explicitly) would
    turn that into 429s. Also guarantees no test ever talks to a real SMS or
    email provider, whatever the developer's .env holds."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "otp_resend_cooldown_seconds", 0)
    monkeypatch.setattr(settings, "sms_api_key", "")
    monkeypatch.setattr(settings, "email_api_key", "")


@pytest_asyncio.fixture
async def _engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session_factory(_engine):
    """Exposes a session factory so tests can seed/inspect the DB directly."""
    return async_sessionmaker(_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def client(_engine, db_session_factory):
    async def override_get_db():
        async with db_session_factory() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_float():
    """Placeholder hook; float is seeded inline in tests that need it."""
    return None
