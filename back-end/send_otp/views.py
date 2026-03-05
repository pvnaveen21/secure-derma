from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
# from twilio.rest import Client

from .models import OTPRecord

import datetime

User = get_user_model()

MAX_ATTEMPTS    = 3
MAX_RESEND      = 3
RESEND_COOLDOWN = 3   # seconds


# def send_sms(phone, otp):
#     client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
#     client.messages.create(
#         body=f"Your OTP is: {otp}. Valid for 60 seconds.",
#         from_=settings.TWILIO_PHONE,
#         to=phone
#     )


# ─────────────────────────────────────────────
# API 1: Send OTP
# ─────────────────────────────────────────────
class SendOTPView(APIView):
    permission_classes  = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = request.data.get('phone', '').strip()

        if not phone:
            return Response(
                {'error': 'Phone number required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_existing_user = User.objects.filter(phone=phone).exists()

        existing = OTPRecord.objects.filter(
            phone=phone,
            is_used=False
        ).order_by('-created_at').first()

        if existing:

            # 🔒 Handle lock_until first
            if existing.lock_until:
                if existing.is_locked() and existing.lock_remaining_seconds() > 0:
                    remaining = existing.lock_remaining_seconds()
                    minutes   = remaining // 60
                    seconds   = remaining % 60
                    return Response({
                        'error': f'Too many attempts. Try again in {minutes}m {seconds}s.'
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                else:
                    # ✅ Lock expired → wipe record, fresh start
                    existing.delete()
                    existing = None

        if existing:
            # 🚫 Max resends reached → set lock
            if existing.is_max_resend_reached():
                existing.lock_for_10_minutes()
                return Response({
                    'error': f'Maximum {MAX_RESEND} resend attempts reached. Try again in 10 minutes.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # ⏳ Resend cooldown
            seconds_since = (timezone.now() - existing.created_at).total_seconds()
            if seconds_since < RESEND_COOLDOWN:
                wait = int(RESEND_COOLDOWN - seconds_since)
                return Response({
                    'error': f'Please wait {wait} seconds before resending.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # ✅ Cooldown passed → new OTP
            resend_count = existing.resend_count + 1
            existing.delete()
            otp    = OTPRecord.generate_otp()
            record = OTPRecord.objects.create(phone=phone, otp=otp, resend_count=resend_count)

        else:
            otp    = OTPRecord.generate_otp()
            record = OTPRecord.objects.create(phone=phone, otp=otp)

        # try:
        #     send_sms(phone, otp)
        # except Exception as e:
        #     record.delete()
        #     return Response(
        #         {'error': f'SMS failed: {str(e)}'},
        #         status=status.HTTP_500_INTERNAL_SERVER_ERROR
        #     )
        print(otp)

        return Response({
            'message'         : 'OTP sent successfully',
            'is_existing_user': is_existing_user,
            'expires_in'      : 60,
            'resend_in'       : RESEND_COOLDOWN,
            'resend_left'     : MAX_RESEND - record.resend_count,
        }, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
# API 2: Verify OTP
# ─────────────────────────────────────────────
class VerifyOTPView(APIView):
    def post(self, request):
        phone = request.data.get('phone', '').strip()
        otp   = request.data.get('otp', '').strip()

        if not phone or not otp:
            return Response(
                {'error': 'Phone and OTP required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get OTP record
        record = OTPRecord.objects.filter(
            phone=phone,
            is_used=False
        ).order_by('-created_at').first()

        # No record found
        if not record:
            return Response(
                {'error': 'No OTP requested for this number'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Max attempts reached
        if record.is_max_attempts_reached():
            record.delete()
            return Response({
                'error': 'Too many wrong attempts. Please request a new OTP.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # OTP expired
        if not record.is_valid():
            record.delete()
            return Response({
                'error'  : 'OTP expired. Please request a new one.',
                'expired': True,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Wrong OTP
        if record.otp != otp:
            record.attempts += 1
            record.save()
            attempts_left = MAX_ATTEMPTS - record.attempts

            if attempts_left <= 0:
                record.delete()
                return Response({
                    'error': 'Too many wrong attempts. Please request a new OTP.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            return Response({
                'error'        : f'Wrong OTP. {attempts_left} attempt(s) left.',
                'attempts_left': attempts_left,
            }, status=status.HTTP_400_BAD_REQUEST)

        # ✅ OTP correct → delete record
        record.delete()

        # ─────────────────────────────────────────
        # Check User table → create only if new
        # ─────────────────────────────────────────
        user = User.objects.filter(phone=phone).first()

        if user:
            # ✅ Existing user — just login, NO create
            is_new_user = False

        else:
            # ✅ New user — create now (only after OTP verified)
            user = User.objects.create(
                phone   = phone,
                email   = f'{phone}@phone.local',   # placeholder email (required field)
                username= phone,
            )
            user.set_unusable_password()            # no password — OTP login only
            user.save()
            is_new_user = True

        # Issue JWT
        refresh = RefreshToken.for_user(user)

        return Response({
            'access'     : str(refresh.access_token),
            'refresh'    : str(refresh),
            'is_new_user': is_new_user,
            'phone'      : user.phone,
            'message'    : 'Registered successfully' if is_new_user else 'Login success'
        }, status=status.HTTP_200_OK)