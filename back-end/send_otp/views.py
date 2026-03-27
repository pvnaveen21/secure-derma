from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from .models import OTPRecord, OTP_EXPIRY_SECONDS
from .email_otp import EmailOTPError, normalize_email, send_email_otp
from .msg91 import MSG91OTPError, normalize_indian_phone, send_otp

User = get_user_model()

MAX_ATTEMPTS = 3
MAX_RESEND = 3
RESEND_COOLDOWN = 3


def _resolve_destination(payload):
    raw_phone = payload.get('phone', '')
    raw_email = payload.get('email', '')

    if raw_phone:
        return OTPRecord.CHANNEL_PHONE, normalize_indian_phone(raw_phone)

    if raw_email:
        return OTPRecord.CHANNEL_EMAIL, normalize_email(raw_email)

    raise ValueError('Phone number or email is required')


def _record_lookup(channel, destination):
    if channel == OTPRecord.CHANNEL_PHONE:
        return {'channel': channel, 'phone': destination, 'is_used': False}

    return {'channel': channel, 'email': destination, 'is_used': False}


def _record_create_payload(channel, destination, otp, resend_count=0):
    payload = {
        'channel': channel,
        'phone': '',
        'email': None,
        'otp': otp,
        'resend_count': resend_count,
    }
    if channel == OTPRecord.CHANNEL_PHONE:
        payload['phone'] = destination
    else:
        payload['email'] = destination
    return payload


def _destination_label(channel):
    return 'number' if channel == OTPRecord.CHANNEL_PHONE else 'email'


def _auth_source_for_channel(channel):
    return 'phone' if channel == OTPRecord.CHANNEL_PHONE else 'email'


class SendOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            channel, destination = _resolve_destination(request.data)
        except (ValueError, MSG91OTPError, EmailOTPError) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if channel == OTPRecord.CHANNEL_PHONE:
            is_existing_user = User.objects.filter(phone=destination).exists()
        else:
            is_existing_user = User.objects.filter(email__iexact=destination).exists()

        existing = OTPRecord.objects.filter(**_record_lookup(channel, destination)).order_by('-created_at').first()

        if existing:
            if existing.lock_until:
                if existing.is_locked() and existing.lock_remaining_seconds() > 0:
                    remaining = existing.lock_remaining_seconds()
                    minutes = remaining // 60
                    seconds = remaining % 60
                    return Response(
                        {'error': f'Too many attempts. Try again in {minutes}m {seconds}s.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                    )
                existing.delete()
                existing = None

        if existing:
            if existing.is_max_resend_reached():
                existing.lock_for_10_minutes()
                return Response(
                    {'error': f'Maximum {MAX_RESEND} resend attempts reached. Try again in 10 minutes.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            seconds_since = (timezone.now() - existing.created_at).total_seconds()
            if seconds_since < RESEND_COOLDOWN:
                wait = int(RESEND_COOLDOWN - seconds_since)
                return Response(
                    {'error': f'Please wait {wait} seconds before resending.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            resend_count = existing.resend_count + 1
            existing.delete()
            otp = OTPRecord.generate_otp()
            record = OTPRecord.objects.create(**_record_create_payload(channel, destination, otp, resend_count))
        else:
            otp = OTPRecord.generate_otp()
            record = OTPRecord.objects.create(**_record_create_payload(channel, destination, otp))

        try:
            if channel == OTPRecord.CHANNEL_PHONE:
                provider_response = send_otp(destination, otp)
            else:
                provider_response = send_email_otp(destination, otp)
        except (MSG91OTPError, EmailOTPError) as exc:
            record.delete()
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        request_id = provider_response.get('request_id', '')
        if request_id:
            record.request_id = request_id
            record.save(update_fields=['request_id'])

        return Response({
            'message': 'OTP sent successfully',
            'is_existing_user': is_existing_user,
            'expires_in': OTP_EXPIRY_SECONDS,
            'resend_in': RESEND_COOLDOWN,
            'resend_left': MAX_RESEND - record.resend_count,
            'request_id': request_id,
            'channel': channel,
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    def post(self, request):
        otp = request.data.get('otp', '').strip()

        if not otp:
            return Response({'error': 'OTP required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            channel, destination = _resolve_destination(request.data)
        except (ValueError, MSG91OTPError, EmailOTPError) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        record = OTPRecord.objects.filter(**_record_lookup(channel, destination)).order_by('-created_at').first()

        if not record:
            return Response({'error': f'No OTP requested for this {_destination_label(channel)}'}, status=status.HTTP_400_BAD_REQUEST)

        if record.is_max_attempts_reached():
            record.delete()
            return Response({'error': 'Too many wrong attempts. Please request a new OTP.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if not record.is_valid():
            record.delete()
            return Response({'error': 'OTP expired. Please request a new one.', 'expired': True}, status=status.HTTP_400_BAD_REQUEST)

        if record.otp != otp:
            record.attempts += 1
            record.save()
            attempts_left = MAX_ATTEMPTS - record.attempts

            if attempts_left <= 0:
                record.delete()
                return Response({'error': 'Too many wrong attempts. Please request a new OTP.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

            return Response(
                {
                    'error': f'Wrong OTP for this {_destination_label(channel)}. {attempts_left} attempt(s) left.',
                    'attempts_left': attempts_left,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        record.delete()

        if channel == OTPRecord.CHANNEL_PHONE:
            user = User.objects.filter(phone=destination).first()
        else:
            user = User.objects.filter(email__iexact=destination).first()

        auth_source = _auth_source_for_channel(channel)

        if user:
            is_new_user = False
            update_fields = ['auth_source', 'modified_at']
            user.auth_source = auth_source
            if channel == OTPRecord.CHANNEL_PHONE and not user.phone:
                user.phone = destination
                update_fields.append('phone')
            user.save(update_fields=update_fields)
        else:
            create_payload = {
                'username': destination.split('@')[0] if channel == OTPRecord.CHANNEL_EMAIL else destination,
                'email': destination if channel == OTPRecord.CHANNEL_EMAIL else f'{destination}@phone.local',
                'auth_source': auth_source,
            }
            if channel == OTPRecord.CHANNEL_PHONE:
                create_payload['phone'] = destination

            user = User.objects.create(**create_payload)
            user.set_unusable_password()
            user.save(update_fields=['password'])
            is_new_user = True

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'is_new_user': is_new_user,
            'phone': user.phone,
            'email': user.email,
            'message': 'Registered successfully' if is_new_user else 'Login success'
        }, status=status.HTTP_200_OK)
