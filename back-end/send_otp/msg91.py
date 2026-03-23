import requests

from config.env import env_int, env_str


class MSG91OTPError(Exception):
    pass


def normalize_indian_phone(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())

    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]

    if len(digits) != 10 or digits[0] not in "6789":
        raise MSG91OTPError("Enter a valid 10-digit Indian mobile number.")

    return digits


def send_otp(phone: str, otp: str) -> dict:
    auth_key = env_str("MSG91_AUTH_KEY", default="")
    template_id = env_str("MSG91_TEMPLATE_ID", default="")
    otp_url = env_str("MSG91_OTP_URL", default="https://api.msg91.com/api/v5/otp")
    otp_expiry = env_int("MSG91_OTP_EXPIRY_SECONDS", env_int("OTP_EXPIRY_SECONDS", 600))
    timeout = env_int("MSG91_TIMEOUT_SECONDS", 10)

    if not auth_key or not template_id:
        raise MSG91OTPError("MSG91 OTP is not configured on the server.")

    normalized_phone = normalize_indian_phone(phone)
    payload = {
        "authkey": auth_key,
        "mobile": f"91{normalized_phone}",
        "template_id": template_id,
        "otp": otp,
        "otp_expiry": otp_expiry,
    }

    try:
        response = requests.post(otp_url, json=payload, timeout=timeout)
    except requests.RequestException as exc:
        raise MSG91OTPError("Unable to reach MSG91 right now. Please try again.") from exc

    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {}

    if response.ok:
        return response_payload

    error_message = (
        response_payload.get("message")
        or response_payload.get("error")
        or response.text
        or "MSG91 rejected the OTP request."
    )
    raise MSG91OTPError(str(error_message))
