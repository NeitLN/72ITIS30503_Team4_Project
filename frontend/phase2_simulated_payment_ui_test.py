from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
checkout = (ROOT / "components" / "checkout" / "CheckoutClient.tsx").read_text(encoding="utf-8")
i18n = (ROOT / "lib" / "i18n.ts").read_text(encoding="utf-8")

required_checkout_tokens = [
    "simulated_card",
    "cardBrand",
    "lastFour",
    'id="simulated-card-brand"',
    'id="simulated-card-last-four"',
    'inputMode="numeric"',
    'maxLength={4}',
    'aria-describedby={errors.lastFour ? \'simulated-card-last-four-error\'',
]
for token in required_checkout_tokens:
    assert token in checkout, f"Checkout is missing safe simulated-card UI token: {token}"

assert "cardNumber" not in checkout, "Checkout must not render or collect a full card number."
assert "cvv" not in checkout.lower(), "Checkout must not render or collect CVV."
assert "cvc" not in checkout.lower(), "Checkout must not render or collect CVC."
assert not re.search(r'(id|name)=["\'][^"\']*pin[^"\']*["\']', checkout, re.IGNORECASE), "Checkout must not render or collect a PIN."

warning = "Simulated payment for academic demonstration only. No real card or money is processed."
assert warning in i18n, "The exact academic demonstration warning must be present in translations."

print("[PASS] Checkout exposes only brand and last-four simulated-card fields with accessible validation.")
