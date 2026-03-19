import os

from django.template.loader import render_to_string
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Email, Mail
from python_http_client.exceptions import HTTPError


class OrderEmailError(Exception):
    pass


def get_order_recipient(order) -> str:
    if order.customer_email:
        return order.customer_email.strip().lower()

    if order.user and order.user.email:
        return order.user.email.strip().lower()

    return ""


def send_order_confirmation_email(order) -> bool:
    recipient = get_order_recipient(order)
    if not recipient:
        return False

    api_key = os.getenv("SENDGRID_API_KEY", "").strip()
    from_email = os.getenv("ORDER_EMAIL_FROM", "").strip() or os.getenv("OTP_EMAIL_FROM", "").strip() or os.getenv("SENDGRID_FROM_EMAIL", "").strip()
    from_name = os.getenv("ORDER_EMAIL_FROM_NAME", "").strip() or os.getenv("OTP_EMAIL_FROM_NAME", "").strip() or os.getenv("SENDGRID_FROM_NAME", "Secure Derma").strip()
    subject = os.getenv("ORDER_EMAIL_SUBJECT", f"Secure Derma order confirmed: {order.order_number}").strip()

    if not api_key or not from_email:
        raise OrderEmailError("Order email is not configured on the server.")

    context = {
        "order": order,
        "recipient_name": order.customer_name or (order.user.username if order.user else "Customer"),
        "recipient_email": recipient,
        "grand_total": order.amount_rupees,
        "item_count": sum(item.quantity for item in order.items.all()),
    }

    text_body = render_to_string("secure_derma/order_confirmation_email.txt", context)
    html_body = render_to_string("secure_derma/order_confirmation_email.html", context)

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
        raise OrderEmailError(f"SendGrid error: {detail}") from exc
    except Exception as exc:
        raise OrderEmailError(f"Unable to send order email right now. {exc}") from exc

    if response.status_code >= 400:
        raise OrderEmailError(f"Twilio SendGrid rejected the order email request with status {response.status_code}.")

    return True
