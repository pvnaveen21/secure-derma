import logging

import requests

from config.env import env_int, env_str


class MSG91OTPError(Exception):
    pass


logger = logging.getLogger(__name__)


def _as_dict(value) -> dict:
    return value if isinstance(value, dict) else {}


def _as_list(value) -> list:
    return value if isinstance(value, list) else []


def _extract_request_id(response_payload: dict) -> str:
    if not isinstance(response_payload, dict):
        return ""

    nested_data = _as_dict(response_payload.get("data"))
    request_id = (
        response_payload.get("request_id")
        or response_payload.get("requestId")
        or nested_data.get("request_id")
        or nested_data.get("requestId")
    )
    if request_id is None:
        return ""

    return str(request_id).strip()


def _iter_payload_nodes(value):
    if isinstance(value, dict):
        yield value
        for nested_value in value.values():
            yield from _iter_payload_nodes(nested_value)
        return

    if isinstance(value, list):
        for item in value:
            yield from _iter_payload_nodes(item)


def _payload_has_failure_signal(response_payload: dict) -> bool:
    failure_values = {"error", "errors", "failed", "failure", "rejected", "invalid", "undelivered"}
    for node in _iter_payload_nodes(response_payload):
        status_value = str(node.get("status") or node.get("type") or "").strip().lower()
        if status_value in failure_values:
            return True

        for boolean_key in ("success", "ok", "sent", "delivered"):
            if boolean_key in node and node.get(boolean_key) is False:
                return True

    return False


def _is_success_response(response: requests.Response, response_payload: dict) -> bool:
    if not response.ok:
        return False

    if not isinstance(response_payload, dict):
        return response.ok

    if _payload_has_failure_signal(response_payload):
        return False

    return True


def _extract_error_message(response_payload: dict, fallback_text: str, default_message: str) -> str:
    if isinstance(response_payload, dict):
        for node in _iter_payload_nodes(response_payload):
            message = node.get("message") or node.get("error") or node.get("errors") or node.get("reason")
            if isinstance(message, list):
                flattened = ", ".join(str(item) for item in message if item)
                if flattened:
                    return flattened
            if message:
                return str(message)

        nested_data = _as_dict(response_payload.get("data"))
        for item in _as_list(response_payload.get("messages")) + _as_list(nested_data.get("messages")):
            if isinstance(item, dict):
                item_message = item.get("message") or item.get("error") or item.get("reason")
                if item_message:
                    return str(item_message)

    if fallback_text:
        return fallback_text

    return default_message


def normalize_indian_phone(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())

    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]

    if len(digits) != 10 or digits[0] not in "6789":
        raise MSG91OTPError("Enter a valid 10-digit Indian mobile number.")

    return digits


def _render_whatsapp_template_value(template_value: str, otp: str, phone: str, otp_expiry: int) -> str:
    value_map = {
        "otp": otp,
        "phone": phone,
        "expiry_seconds": str(otp_expiry),
        "expiry_minutes": str(max(1, otp_expiry // 60)),
    }
    return value_map.get(template_value, template_value)


def _build_whatsapp_components(otp: str, phone: str, otp_expiry: int) -> dict:
    body_1_value = env_str("MSG91_WHATSAPP_BODY_1_VALUE", default="", allow_blank=True)
    button_1_value = env_str("MSG91_WHATSAPP_BUTTON_1_VALUE", default="", allow_blank=True)

    components = {}

    if body_1_value:
        components["body_1"] = {
            "type": env_str("MSG91_WHATSAPP_BODY_1_TYPE", default="text"),
            "value": _render_whatsapp_template_value(body_1_value, otp, phone, otp_expiry),
        }

    if button_1_value:
        components["button_1"] = {
            "subtype": env_str("MSG91_WHATSAPP_BUTTON_1_SUBTYPE", default="url"),
            "type": env_str("MSG91_WHATSAPP_BUTTON_1_TYPE", default="text"),
            "value": _render_whatsapp_template_value(button_1_value, otp, phone, otp_expiry),
        }

    if not components:
        raise MSG91OTPError("MSG91 WhatsApp OTP template components are not configured on the server.")

    return components


def _send_whatsapp_otp(phone: str, otp: str, auth_key: str, otp_expiry: int, timeout: int) -> dict:
    integrated_number = env_str("MSG91_WHATSAPP_INTEGRATED_NUMBER", default="")
    template_name = env_str("MSG91_WHATSAPP_TEMPLATE_NAME", default="")
    language_code = env_str("MSG91_WHATSAPP_TEMPLATE_LANGUAGE_CODE", default="en")
    language_policy = env_str("MSG91_WHATSAPP_TEMPLATE_LANGUAGE_POLICY", default="deterministic")
    whatsapp_url = env_str(
        "MSG91_WHATSAPP_URL",
        default="https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    )

    if not integrated_number or not template_name:
        raise MSG91OTPError("MSG91 WhatsApp OTP is not configured on the server.")

    normalized_phone = normalize_indian_phone(phone)
    full_phone = f"91{normalized_phone}"
    template_payload = {
        "name": template_name,
        "language": {
            "code": language_code,
            "policy": language_policy,
        },
        "to_and_components": [
            {
                "to": [full_phone],
                "components": _build_whatsapp_components(otp, normalized_phone, otp_expiry),
            }
        ],
    }

    payload = {
        "integrated_number": integrated_number,
        "content_type": "template",
        "payload": {
            "messaging_product": "whatsapp",
            "type": "template",
            "template": template_payload,
        },
    }
    logger.warning(
        "MSG91 WhatsApp payload prepared for %s: %s",
        full_phone,
        payload,
    )
    headers = {
        "Content-Type": "application/json",
        "authkey": auth_key,
    }

    try:
        response = requests.post(whatsapp_url, headers=headers, json=payload, timeout=timeout)
    except requests.RequestException as exc:
        raise MSG91OTPError("Unable to reach MSG91 right now. Please try again.") from exc

    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {}

    if _is_success_response(response, response_payload):
        request_id = _extract_request_id(response_payload)
        if request_id and isinstance(response_payload, dict):
            response_payload["request_id"] = request_id
        return response_payload

    error_message = _extract_error_message(
        response_payload,
        response.text,
        "MSG91 rejected the WhatsApp OTP request.",
    )
    raise MSG91OTPError(str(error_message))


def send_otp(phone: str, otp: str) -> dict:
    auth_key = env_str("MSG91_AUTH_KEY", default="")
    delivery_channel = env_str("MSG91_DELIVERY_CHANNEL", default="otp").lower()
    template_id = env_str("MSG91_TEMPLATE_ID", default="")
    otp_url = env_str("MSG91_OTP_URL", default="https://api.msg91.com/api/v5/otp")
    otp_expiry = env_int("MSG91_OTP_EXPIRY_SECONDS", env_int("OTP_EXPIRY_SECONDS", 600))
    timeout = env_int("MSG91_TIMEOUT_SECONDS", 10)

    if not auth_key:
        raise MSG91OTPError("MSG91 OTP is not configured on the server.")

    if delivery_channel == "whatsapp":
        return _send_whatsapp_otp(phone, otp, auth_key, otp_expiry, timeout)

    if not template_id:
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

    if _is_success_response(response, response_payload):
        request_id = _extract_request_id(response_payload)
        if request_id and isinstance(response_payload, dict):
            response_payload["request_id"] = request_id
        return response_payload

    error_message = _extract_error_message(
        response_payload,
        response.text,
        "MSG91 rejected the OTP request.",
    )
    raise MSG91OTPError(str(error_message))
