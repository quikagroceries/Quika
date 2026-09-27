"""The login-code email: a light, table-based layout with inline styles, which
is what mail clients (Gmail, Outlook, Apple Mail) render reliably. No remote
images, so nothing is blocked or broken when the recipient's client hides them."""

from datetime import datetime, timezone
from html import escape

ORANGE = "#EE9A5A"
ORANGE_DARK = "#D9773A"
INK = "#1A1A1A"
MUTED = "#6B6558"
CREAM = "#F0ECE0"
PEACH = "#FBE7D5"
LINE = "#E8E2D2"
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"


def otp_email(code: str, minutes: int) -> tuple[str, str, str]:
    """Returns (subject, plain_text, html) for a login code."""
    expiry = f"{minutes} minute{'s' if minutes != 1 else ''}"
    year = datetime.now(timezone.utc).year
    c = escape(code)

    subject = f"{code} is your Qyka verification code"
    text = (
        f"Your Qyka verification code is {code}\n\n"
        f"Enter it to sign in. It expires in {expiry}.\n"
        "Never share this code with anyone. Qyka will never ask you for it.\n\n"
        "If you didn't request this, you can safely ignore this email.\n\n"
        f"Qyka Groceries · Ibadan, Nigeria\n© {year} Qyka Technologies Ltd"
    )
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:{CREAM};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{CREAM};">Your Qyka code is {c}. It expires in {expiry}.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{CREAM};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
    <tr><td style="padding:0 4px 20px;font-family:{FONT};">
      <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:{ORANGE};color:{INK};border-radius:10px;font-size:20px;font-weight:800;vertical-align:middle;">Q</span>
      <span style="font-size:22px;font-weight:800;color:{INK};vertical-align:middle;padding-left:8px;letter-spacing:-0.3px;">Qyka</span>
      <span style="font-size:11px;font-weight:700;color:{MUTED};vertical-align:middle;padding-left:6px;letter-spacing:1.5px;text-transform:uppercase;">Groceries</span>
    </td></tr>
    <tr><td style="background:#FFFFFF;border-radius:20px;border-top:4px solid {ORANGE};padding:36px 32px 32px;font-family:{FONT};">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:{ORANGE_DARK};">Verification code</p>
      <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;font-weight:800;color:{INK};letter-spacing:-0.4px;">Here&rsquo;s your code to sign in</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:{MUTED};">Enter this code in Qyka to continue. It expires in <strong style="color:{INK};white-space:nowrap;">{expiry}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="background:{PEACH};border-radius:16px;padding:22px 12px;">
          <span style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;line-height:1;font-weight:800;letter-spacing:10px;color:{INK};padding-left:10px;">{c}</span>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:{MUTED};"><strong style="color:{INK};">Keep it private.</strong> Never share this code with anyone &mdash; Qyka will never ask you for it.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
        <tr><td style="border-top:1px solid {LINE};padding-top:20px;font-size:13px;line-height:1.55;color:{MUTED};font-family:{FONT};">Didn&rsquo;t ask for this? You can safely ignore this email &mdash; nobody can sign in without the code.</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 8px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED};">
      Qyka Groceries &middot; Ibadan, Nigeria<br>&copy; {year} Qyka Technologies Ltd
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""
    return subject, text, html
