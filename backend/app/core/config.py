from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Qyka Groceries"
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://quika:quika@db:5432/quika"

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, v: str) -> str:
        """Hosts like Render hand out plain postgres:// / postgresql:// URLs;
        the app (and alembic) need the asyncpg driver spelled out."""
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+asyncpg://" + v[len(prefix):]
        return v

    # Auth
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # Admin bootstrap — on every startup, ensures a single admin account
    # exists with this email/password (role=admin). Leave both unset if you
    # don't need an auto-provisioned admin account. Admins sign in with
    # email+password only (POST /admin/login), never phone/OTP.
    bootstrap_admin_email: str | None = None
    bootstrap_admin_password: str | None = None

    # CORS — comma-separated origins allowed to call this API. Defaults to
    # the local Vite dev server; a real deployment must set this to the
    # frontend's actual origin(s), or the browser will block every request.
    allowed_origins: str = "http://localhost:3003,http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # OTP
    otp_expire_minutes: int = 2
    # Request-side abuse cap: max codes a phone number may request per hour.
    otp_max_requests_per_hour: int = 5
    # Verify-side brute-force cap: wrong guesses allowed against one code
    # before it's locked (invalidated) and a fresh one must be requested.
    otp_max_verify_attempts: int = 5

    # Paystack
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_base_url: str = "https://api.paystack.co"

    # Risk model defaults
    default_basket_cap_kobo: int = 500_000  # ₦5,000 for new/unverified users
    payment_window_minutes: int = 45

    # JIT transfer safety caps — the last line of defence with OTP disabled.
    # The rail executes whatever it's asked, so these bound a bug or a leaked key.
    max_transfer_naira: int = 100_000       # no single vendor transfer above this
    max_daily_transfers_naira: int = 500_000  # total outbound per day ceiling

    # SMS / WhatsApp / voice OTP delivery - all through Termii (one key, one
    # sender). Leave the key empty in dev/tests: codes are then returned as
    # `dev_otp` instead of being sent (see auth/otp_delivery.py).
    sms_api_key: str = ""
    sms_sender_id: str = "Qyka"
    sms_base_url: str = "https://api.ng.termii.com"
    # Fallback timing. The UI offers "WhatsApp" / "Call me" once this many
    # seconds have passed without the SMS being confirmed; the server refuses a
    # fresh code sooner than the cooldown so a stuck button can't run up SMS
    # cost or harass a number.
    otp_fallback_after_seconds: int = 45
    otp_resend_cooldown_seconds: int = 30
    # WhatsApp Business API provider (e.g. 360dialog, Twilio) — add later.
    whatsapp_api_key: str = ""
    # Transactional email provider (e.g. Resend, Postmark, SES) — add later.
    # Until set, email OTPs behave like SMS today: shown as dev_otp outside
    # production, never actually sent (see auth/service.py::create_otp).
    email_api_key: str = ""

    # Google Sign-In — the OAuth Client ID from Google Cloud Console
    # (Credentials → OAuth client ID → Web application). Verifies ID tokens
    # from the frontend's Google Identity Services button; phone stays the
    # required primary ID (see auth/service.py::get_or_create_user).
    google_client_id: str = ""

    # LiveKit (voice/video call prototype) — get these from your LiveKit
    # Cloud project. Token generation is local (HMAC-signed JWT); nothing
    # calls out to LiveKit until the frontend connects with the token.
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    @model_validator(mode="after")
    def _fail_closed_on_default_secret(self) -> "Settings":
        """Refuse to start in production with the publicly-known default secret.

        Whoever holds JWT_SECRET can forge a token for any user, including
        admin. A silent fallback to a known value is invisible until someone
        exploits it; a crash on startup is loud and gets fixed immediately.
        """
        if self.environment == "production" and self.jwt_secret == _DEFAULT_JWT_SECRET:
            raise RuntimeError(
                "JWT_SECRET is still the default placeholder. Refusing to "
                "start in production with a publicly-known signing secret — "
                "set a real JWT_SECRET in the environment."
            )
        return self


settings = Settings()
