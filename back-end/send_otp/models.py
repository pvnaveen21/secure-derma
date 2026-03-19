from django.db import models
from django.utils import timezone
import datetime
import secrets
import os


OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "600"))


class OTPRecord(models.Model):
    CHANNEL_PHONE = "phone"
    CHANNEL_EMAIL = "email"
    CHANNEL_CHOICES = (
        (CHANNEL_PHONE, "Phone"),
        (CHANNEL_EMAIL, "Email"),
    )

    channel      = models.CharField(max_length=16, choices=CHANNEL_CHOICES, default=CHANNEL_PHONE)
    phone        = models.CharField(max_length=15)
    email        = models.EmailField(blank=True, null=True)
    otp          = models.CharField(max_length=6)
    request_id   = models.CharField(max_length=64, blank=True, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    is_used      = models.BooleanField(default=False)
    attempts     = models.IntegerField(default=0)
    resend_count = models.IntegerField(default=0)
    lock_until   = models.DateTimeField(null=True, blank=True)

    def is_locked(self):
        if self.lock_until and timezone.now() < self.lock_until:
            return True
        return False

    def lock_for_10_minutes(self):
        self.lock_until = timezone.now() + datetime.timedelta(minutes=1)
        self.save()

    def is_valid(self):
        expiry = self.created_at + datetime.timedelta(seconds=OTP_EXPIRY_SECONDS)
        return not self.is_used and timezone.now() < expiry

    def seconds_remaining(self):
        expiry = self.created_at + datetime.timedelta(seconds=OTP_EXPIRY_SECONDS)
        remaining = (expiry - timezone.now()).total_seconds()
        return max(0, int(remaining))

    def is_max_attempts_reached(self):
        return self.attempts >= 3

    def is_max_resend_reached(self):
        return self.resend_count >= 3

    def lock_remaining_seconds(self):
        if self.lock_until:
            remaining = (self.lock_until - timezone.now()).total_seconds()
            return max(0, int(remaining))
        return 0

    @staticmethod
    def generate_otp():
        return ''.join(secrets.choice("0123456789") for _ in range(6))

    def __str__(self):
        destination = self.phone or self.email or ""
        return f"{self.channel}:{destination} | OTP:{self.otp} | attempts:{self.attempts} | resend:{self.resend_count}"
