from django.template.loader import render_to_string
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Email, Mail
from python_http_client.exceptions import HTTPError

from config.env import env_int, env_str


class EmailOTPError(Exception):
    pass


OTP_EXPIRY_SECONDS = env_int("OTP_EXPIRY_SECONDS", 600)


def normalize_email(value: str) -> str:
    email = str(value or "").strip().lower()
    if not email or "@" not in email:
        raise EmailOTPError("Enter a valid email address.")
    return email


def send_email_otp(email: str, otp: str) -> dict:
    recipient = normalize_email(email)
    api_key = env_str("SENDGRID_API_KEY", default="")
    from_email = env_str("OTP_EMAIL_FROM", default="") or env_str("SENDGRID_FROM_EMAIL", default="")
    from_name = env_str("OTP_EMAIL_FROM_NAME", default="") or env_str("SENDGRID_FROM_NAME", default="Secure Derma")
    subject = env_str("OTP_EMAIL_SUBJECT", default="Secure Derma login verification code")

    if not api_key or not from_email:
        raise EmailOTPError("Twilio SendGrid email OTP is not configured on the server.")

    text_body = (
        "Secure Derma\n\n"
        f"Your login verification code is {otp}.\n\n"
        f"This code is valid for {OTP_EXPIRY_SECONDS} seconds.\n\n"
        "If you did not request this code, you can safely ignore this email."
    )
    html_body = render_to_string(
        "send_otp/otp_email.html",
        {
            "otp": otp,
            "otp_expiry_seconds": OTP_EXPIRY_SECONDS,
        },
    )

    message = Mail(
        from_email=Email(from_email, from_name),
        to_emails=recipient,
        subject=subject,
        plain_text_content=text_body,
        html_content=html_body,
    )

    try:
        response = SendGridAPIClient(api_key).send(message)
    except HTTPError as exc:
        response_body = getattr(exc, "body", b"")
        if isinstance(response_body, bytes):
            response_body = response_body.decode("utf-8", errors="ignore")
        detail = response_body or str(exc)
        raise EmailOTPError(f"SendGrid error: {detail}") from exc
    except Exception as exc:
        raise EmailOTPError(f"Unable to send email OTP right now. {exc}") from exc

    if response.status_code >= 400:
        raise EmailOTPError(f"Twilio SendGrid rejected the email OTP request with status {response.status_code}.")

    request_id = response.headers.get("X-Message-Id", "")
    return {"type": "success", "request_id": request_id}
