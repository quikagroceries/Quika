from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Quika Groceries"
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://quika:quika@db:5432/quika"

    # Auth
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # One-time admin bootstrap — this phone gets role=admin on every startup.
    bootstrap_admin_phone: str | None = None

    # CORS — comma-separated origins allowed to call this API. Defaults to
    # the local Vite dev server; a real deployment must set this to the
    # frontend's actual origin(s), or the browser will block every request.
    allowed_origins: str = "http://localhost:5173"

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

    # SMS (Termii / Africa's Talking) — filled in later
    sms_api_key: str = ""

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
