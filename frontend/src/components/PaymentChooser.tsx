'use client';

import Button from "./Button";

// Used for both payment moments (deposit before shopping, balance after) -
// same choice either way: pay from wallet (only when it covers the amount)
// or pay by bank transfer via Paystack (always available). Never dead-ends
// on a short wallet balance - transfer (and, if offered, topping up) are
// always right there instead of an error state.
function PaymentChooser({ amountDue, walletBalance, onPayWallet, onPayTransfer, onTopUp, busy, error }: any) {
  const loadingBalance = walletBalance == null;
  const insufficient = !loadingBalance && Number(walletBalance) < Number(amountDue);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-slate-700">
        <span>Wallet balance</span>
        <span className="font-semibold text-slate-900">
          {loadingBalance ? "…" : `₦${Number(walletBalance).toFixed(2)}`}
        </span>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold text-slate-900">Amount due</span>
        <span className="text-lg font-bold text-slate-900">₦{Number(amountDue).toFixed(2)}</span>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-2">
        <Button onClick={onPayWallet} busy={busy} disabled={loadingBalance || insufficient} fullWidth>
          Pay from wallet
        </Button>
        {insufficient && (
          <p className="text-center text-sm text-amber-700">
            Insufficient balance — pay by transfer or top up.
          </p>
        )}

        <Button variant="secondary" onClick={onPayTransfer} busy={busy} fullWidth>
          Pay by bank transfer
        </Button>

        {insufficient && onTopUp && (
          <Button variant="neutral" onClick={onTopUp} fullWidth>
            Top up wallet
          </Button>
        )}
      </div>
    </div>
  );
}

export default PaymentChooser;
