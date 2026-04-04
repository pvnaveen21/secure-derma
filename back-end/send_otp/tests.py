from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from send_otp.models import OTPRecord


User = get_user_model()


@override_settings(ROOT_URLCONF="config.urls")
class OTPApiTests(APITestCase):
    send_url = "/api/auth/sendotp/"
    verify_url = "/api/auth/otp-verify/"
    delivery_webhook_url = "/api/auth/otp-delivery-webhook/"

    @patch.dict(
        "os.environ",
        {
            "MSG91_AUTH_KEY": "test-auth-key",
            "MSG91_TEMPLATE_ID": "test-template-id",
            "MSG91_OTP_EXPIRY_SECONDS": "60",
            "MSG91_TIMEOUT_SECONDS": "5",
            "OTP_RESEND_COOLDOWN_SECONDS": "60",
        },
        clear=False,
    )
    @patch("send_otp.msg91.requests.post")
    def test_send_otp_calls_msg91_and_creates_record(self, mock_post):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {"type": "success", "request_id": "msg91-request-123"}
        mock_post.return_value = mock_response

        response = self.client.post(self.send_url, {"phone": "9876543210"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record = OTPRecord.objects.get(phone="9876543210")
        self.assertEqual(record.request_id, "msg91-request-123")
        self.assertEqual(response.data["request_id"], "msg91-request-123")
        self.assertEqual(response.data["resend_in"], 60)
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["json"]["mobile"], "919876543210")
        self.assertEqual(kwargs["json"]["otp_expiry"], 60)

    @patch.dict(
        "os.environ",
        {
            "MSG91_AUTH_KEY": "test-auth-key",
            "MSG91_DELIVERY_CHANNEL": "whatsapp",
            "MSG91_OTP_EXPIRY_SECONDS": "600",
            "MSG91_WHATSAPP_INTEGRATED_NUMBER": "919363789390",
            "MSG91_WHATSAPP_TEMPLATE_NAME": "secure_derma_authentication",
            "MSG91_WHATSAPP_TEMPLATE_LANGUAGE_CODE": "en",
            "MSG91_WHATSAPP_TEMPLATE_LANGUAGE_POLICY": "deterministic",
            "MSG91_WHATSAPP_BODY_1_TYPE": "text",
            "MSG91_WHATSAPP_BODY_1_VALUE": "otp",
            "MSG91_WHATSAPP_BUTTON_1_SUBTYPE": "url",
            "MSG91_WHATSAPP_BUTTON_1_TYPE": "text",
            "MSG91_WHATSAPP_BUTTON_1_VALUE": "otp",
        },
        clear=False,
    )
    @patch("send_otp.msg91.requests.post")
    def test_send_otp_calls_msg91_whatsapp_template_api(self, mock_post):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {"status": "success", "request_id": "wa-request-123"}
        mock_post.return_value = mock_response

        response = self.client.post(self.send_url, {"phone": "9876543210"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record = OTPRecord.objects.get(phone="9876543210")
        self.assertEqual(record.request_id, "wa-request-123")
        _, kwargs = mock_post.call_args
        template = kwargs["json"]["payload"]["template"]
        components = template["to_and_components"][0]["components"]
        self.assertEqual(kwargs["headers"]["authkey"], "test-auth-key")
        self.assertEqual(kwargs["json"]["integrated_number"], "919363789390")
        self.assertEqual(template["to_and_components"][0]["to"], ["919876543210"])
        self.assertNotIn("namespace", template)
        self.assertEqual(components["body_1"]["value"], record.otp)
        self.assertEqual(components["body_1"]["type"], "text")
        self.assertEqual(components["button_1"]["subtype"], "url")
        self.assertEqual(components["button_1"]["value"], record.otp)
        self.assertEqual(components["button_1"]["type"], "text")
        self.assertEqual(response.data["delivery_status"], "pending")

    @patch.dict(
        "os.environ",
        {
            "MSG91_AUTH_KEY": "test-auth-key",
            "MSG91_TEMPLATE_ID": "test-template-id",
        },
        clear=False,
    )
    @patch("send_otp.msg91.requests.post")
    def test_send_otp_rejects_msg91_error_payload_even_when_http_status_is_200(self, mock_post):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {"type": "error", "message": "Template not found"}
        mock_response.text = '{"type":"error","message":"Template not found"}'
        mock_post.return_value = mock_response

        response = self.client.post(self.send_url, {"phone": "9876543210"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["error"], "Template not found")
        self.assertFalse(OTPRecord.objects.filter(phone="9876543210").exists())

    @patch.dict(
        "os.environ",
        {
            "MSG91_AUTH_KEY": "test-auth-key",
            "MSG91_DELIVERY_CHANNEL": "whatsapp",
            "MSG91_OTP_EXPIRY_SECONDS": "600",
            "MSG91_WHATSAPP_INTEGRATED_NUMBER": "919363789390",
            "MSG91_WHATSAPP_TEMPLATE_NAME": "securederma_otp_login",
        },
        clear=False,
    )
    @patch("send_otp.msg91.requests.post")
    def test_send_otp_rejects_nested_whatsapp_failure_payload(self, mock_post):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            "status": "success",
            "data": {
                "messages": [
                    {
                        "status": "failed",
                        "reason": "WhatsApp template is not approved for this number",
                    }
                ]
            },
        }
        mock_response.text = '{"status":"success"}'
        mock_post.return_value = mock_response

        response = self.client.post(self.send_url, {"phone": "9876543210"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["error"], "WhatsApp template is not approved for this number")
        self.assertFalse(OTPRecord.objects.filter(phone="9876543210").exists())

    def test_delivery_webhook_updates_matching_otp_record(self):
        record = OTPRecord.objects.create(
            phone="9876543210",
            otp="123456",
            request_id="req-123",
        )

        response = self.client.post(
            self.delivery_webhook_url,
            {
                "data": {
                    "request_id": "req-123",
                    "messages": [
                        {
                            "status": "failed",
                            "reason": "Recipient is not opted in",
                        }
                    ],
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record.refresh_from_db()
        self.assertEqual(record.delivery_status, "failed")
        self.assertEqual(record.delivery_message, "Recipient is not opted in")
        self.assertIsNotNone(record.delivery_payload)
        self.assertIsNotNone(record.delivery_updated_at)

    def test_delivery_webhook_returns_accepted_when_request_id_does_not_match(self):
        response = self.client.post(
            self.delivery_webhook_url,
            {"request_id": "missing-req", "status": "failed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.data["received"])
        self.assertFalse(response.data["matched"])

    def test_delivery_webhook_requires_request_id(self):
        response = self.client.post(
            self.delivery_webhook_url,
            {"status": "failed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["received"])

    @patch.dict(
        "os.environ",
        {
            "MSG91_AUTH_KEY": "test-auth-key",
            "MSG91_TEMPLATE_ID": "test-template-id",
            "OTP_RESEND_COOLDOWN_SECONDS": "60",
        },
        clear=False,
    )
    @patch("send_otp.msg91.requests.post")
    def test_send_otp_enforces_sixty_second_resend_cooldown(self, mock_post):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {"type": "success", "request_id": "msg91-request-123"}
        mock_post.return_value = mock_response

        first_response = self.client.post(self.send_url, {"phone": "9876543210"}, format="json")
        second_response = self.client.post(self.send_url, {"phone": "9876543210"}, format="json")

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("Please wait", second_response.data["error"])

    @patch("send_otp.email_otp.SendGridAPIClient")
    def test_send_otp_sends_email_otp(self, mock_sendgrid_client):
        mock_client = mock_sendgrid_client.return_value
        mock_client.send.return_value = Mock(status_code=202, headers={"X-Message-Id": "sendgrid-msg-123"})

        with patch.dict(
            "os.environ",
            {
                "SENDGRID_API_KEY": "sendgrid-key",
                "SENDGRID_FROM_EMAIL": "noreply@example.com",
                "OTP_EMAIL_SUBJECT": "Secure Derma verification code",
            },
            clear=False,
        ):
            response = self.client.post(self.send_url, {"email": "person@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["channel"], "email")
        record = OTPRecord.objects.get(email="person@example.com")
        self.assertEqual(record.channel, "email")
        self.assertEqual(record.request_id, "sendgrid-msg-123")
        mock_client.send.assert_called_once()

    def test_send_otp_rejects_invalid_phone(self):
        response = self.client.post(self.send_url, {"phone": "12345"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Enter a valid 10-digit Indian mobile number.")

    def test_verify_otp_logs_in_existing_user(self):
        user = User.objects.create_user(
            email="otp-user@example.com",
            password="Password123!",
            username="OTP User",
            phone="9876543210",
        )
        OTPRecord.objects.create(phone="9876543210", otp="123456")

        response = self.client.post(
            self.verify_url,
            {"phone": "9876543210", "otp": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["phone"], user.phone)
        self.assertFalse(response.data["is_new_user"])
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_verify_otp_creates_new_user(self):
        OTPRecord.objects.create(phone="9123456789", otp="654321")

        response = self.client.post(
            self.verify_url,
            {"phone": "+91 91234 56789", "otp": "654321"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new_user"])
        self.assertTrue(User.objects.filter(phone="9123456789").exists())

    def test_verify_otp_creates_new_email_user(self):
        OTPRecord.objects.create(channel="email", phone="", email="new@example.com", otp="111222")

        response = self.client.post(
            self.verify_url,
            {"email": "new@example.com", "otp": "111222"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new_user"])
        self.assertTrue(User.objects.filter(email="new@example.com").exists())
