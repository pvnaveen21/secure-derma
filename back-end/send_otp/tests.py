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

    @patch.dict(
        "os.environ",
        {
            "MSG91_AUTH_KEY": "test-auth-key",
            "MSG91_TEMPLATE_ID": "test-template-id",
            "MSG91_OTP_EXPIRY_SECONDS": "60",
            "MSG91_TIMEOUT_SECONDS": "5",
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
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["json"]["mobile"], "919876543210")
        self.assertEqual(kwargs["json"]["otp_expiry"], 60)

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
