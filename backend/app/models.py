"""Import all models here so Alembic autogenerate sees every table."""

from app.agent_applications.models import AgentApplication  # noqa: F401
from app.auth.models import OtpCode, User  # noqa: F401
from app.chat.models import ChatRead, Message  # noqa: F401
from app.float.models import FloatLedger, PoolLock  # noqa: F401
from app.markets.models import Agent, Market  # noqa: F401
from app.orders.models import Order, OrderItem  # noqa: F401
from app.payments.models import Transaction  # noqa: F401
from app.wallet.models import Wallet, WalletLedger  # noqa: F401
from app.notifications.models import Notification  # noqa: F401
from app.jit.models import (  # noqa: F401
    SpendingAuthorization, Seller, VendorAccount, VendorTransfer,
)
from app.ratings.models import AgentRating  # noqa: F401
from app.locations.models import LocationSearch  # noqa: F401