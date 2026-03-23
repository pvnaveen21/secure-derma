from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
import os
import re
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from user.models import User


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_google_login': user.is_google_login,
    }


def _normalize_profile_payload(payload):
    username = re.sub(r"\s+", " ", str(payload.get('username', '') or '')).strip()
    email = str(payload.get('email', '') or '').strip().lower()
    phone = re.sub(r"\D", "", str(payload.get('phone', '') or ''))[:10]

    if not re.fullmatch(r"^[A-Za-z][A-Za-z .'-]{1,79}$", username):
        raise ValueError('Enter a valid full name.')

    try:
        validate_email(email)
    except ValidationError as exc:
        raise ValueError('Enter a valid email address.') from exc

    if not re.fullmatch(r"^[6-9]\d{9}$", phone):
        raise ValueError('Enter a valid 10-digit mobile number.')

    return {
        'username': username,
        'email': email,
        'phone': phone,
    }


class AdminLoginApiView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(email=email, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_staff:
            return Response(
                {'error': 'Access denied. Admins only.'},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'Login successful.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
            }
        }, status=status.HTTP_200_OK)


class AdminTokenRefreshView(TokenRefreshView):
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = super().post(request, *args, **kwargs)
            return Response({
                'message': 'Token refreshed successfully.',
                'access': response.data.get('access'),
            }, status=status.HTTP_200_OK)

        except TokenError as e:
            return Response(
                {'error': 'Invalid or expired refresh token.', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        except InvalidToken as e:
            return Response(
                {'error': 'Invalid token.', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserTokenRefreshView(TokenRefreshView):

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = super().post(request, *args, **kwargs)
            return Response({
                'message': 'Token refreshed successfully.',
                'access': response.data.get('access'),
            }, status=status.HTTP_200_OK)

        except TokenError as e:
            return Response(
                {'error': 'Invalid or expired refresh token.', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

        except InvalidToken as e:
            return Response(
                {'error': 'Invalid token.', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )


class AdminDetailApiView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }, status=status.HTTP_200_OK)


class UserDetailApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(_serialize_user(user), status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user

        try:
            profile = _normalize_profile_payload(request.data)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=profile['email']).exclude(pk=user.pk).exists():
            return Response({'detail': 'This email address is already in use.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(phone=profile['phone']).exclude(pk=user.pk).exists():
            return Response({'detail': 'This mobile number is already in use.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_google_login and profile['email'] != user.email:
            return Response(
                {'detail': 'Email cannot be changed for Google login accounts.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.username = profile['username']
        user.email = profile['email']
        user.phone = profile['phone']
        user.save(update_fields=['username', 'email', 'phone', 'modified_at'])

        return Response(_serialize_user(user), status=status.HTTP_200_OK)

from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.decorators import api_view

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

@api_view(['POST'])
def google_login(request):
    token = request.data.get("token")

    if not token:
        return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=300,  # tolerate up to 5 min clock drift
        )

        email = idinfo['email']
        name = idinfo.get('name', '')
        google_uid = idinfo.get('sub')        # Google's unique user ID
        profile_image = idinfo.get('picture') # Google profile picture URL

        user, created = User.objects.get_or_create(
            email=email,  # use email not username, since EMAIL_FIELD = 'email'
            defaults={
                'username': name,
                'is_google_login': True,
                'google_uid': google_uid,
            }
        )

        # Update google fields if user already exists
        if not created:
            user.is_google_login = True
            user.google_uid = google_uid
            user.save(update_fields=['is_google_login', 'google_uid'])

        # Generate JWT tokens same as login API
        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'Login successful.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
                'profile_image': profile_image,  # from Google, not stored locally
            }
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        error_msg = str(e)
        if 'Token expired' in error_msg:
            return Response(
                {"error": "Token expired", "detail": "Your Google session has expired. Please try signing in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(
            {"error": "Invalid token", "detail": error_msg},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": "Server error", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
