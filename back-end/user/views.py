from datetime import date, timedelta
import re

from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from config.env import env_str
from user.models import User, UserAuthSource


def _serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_google_login': user.is_google_login,
        'auth_source': user.auth_source,
    }


def _serialize_admin_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'is_google_login': user.is_google_login,
        'created_at': user.created_at,
        'auth_source': user.auth_source,
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


def _get_admin_user_queryset():
    return User.objects.filter(is_deleted=False, is_staff=False, is_superuser=False)


def _add_months(value: date, months: int) -> date:
    month_index = (value.month - 1) + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


GOOGLE_CLIENT_ID = env_str("GOOGLE_CLIENT_ID", default="")


class AdminLoginApiView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(email=email, password=password)

        if user is None:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_staff:
            return Response({'error': 'Access denied. Admins only.'}, status=status.HTTP_403_FORBIDDEN)

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
            return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = super().post(request, *args, **kwargs)
            return Response({'message': 'Token refreshed successfully.', 'access': response.data.get('access')}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({'error': 'Invalid or expired refresh token.', 'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except InvalidToken as e:
            return Response({'error': 'Invalid token.', 'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)


class UserTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = super().post(request, *args, **kwargs)
            return Response({'message': 'Token refreshed successfully.', 'access': response.data.get('access')}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({'error': 'Invalid or expired refresh token.', 'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except InvalidToken as e:
            return Response({'error': 'Invalid token.', 'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)


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


class AdminUserSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        today = timezone.localdate()
        users = _get_admin_user_queryset()
        latest_user = users.order_by('-created_at').first()

        return Response({
            'summary': {
                'total_users': users.count(),
                'today_new_users': users.filter(created_at__date=today).count(),
                'google_users': users.filter(auth_source=UserAuthSource.GOOGLE).count(),
                'mobile_users': users.filter(auth_source=UserAuthSource.PHONE).count(),
                'email_users': users.filter(auth_source=UserAuthSource.EMAIL).count(),
                'latest_user_at': latest_user.created_at if latest_user else None,
            }
        })


class AdminUserAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        grouping = request.query_params.get('grouping', 'day').strip().lower() or 'day'

        if grouping not in {'day', 'month'}:
            return Response({'detail': "Grouping must be either 'day' or 'month'."}, status=status.HTTP_400_BAD_REQUEST)

        default_periods = 14 if grouping == 'day' else 12
        max_periods = 180 if grouping == 'day' else 36

        try:
            periods = int(request.query_params.get('periods', default_periods))
        except ValueError:
            return Response({'detail': 'Periods must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)

        if periods < 1 or periods > max_periods:
            return Response({'detail': f'Periods must be between 1 and {max_periods} for {grouping} grouping.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        users = _get_admin_user_queryset()
        anchor_month_value = request.query_params.get('anchor_month', '').strip()
        anchor_date_value = request.query_params.get('anchor_date', '').strip()

        if grouping == 'day':
            if anchor_date_value:
                try:
                    end_date = date.fromisoformat(anchor_date_value)
                except ValueError:
                    return Response({'detail': 'anchor_date must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
                if end_date > today:
                    end_date = today
            else:
                end_date = today

            start_date = end_date - timedelta(days=periods - 1)
            grouped_rows = (
                users
                .filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
                .annotate(period=TruncDate('created_at'))
                .values('period')
                .annotate(count=Count('id'))
                .order_by('period')
            )

            count_map = {row['period'].isoformat(): row['count'] for row in grouped_rows if row['period']}
            bucket_dates = [start_date + timedelta(days=index) for index in range(periods)]
            series = [
                {
                    'key': bucket_date.isoformat(),
                    'label': bucket_date.strftime('%d %b %Y'),
                    'short_label': bucket_date.strftime('%d %b'),
                    'count': count_map.get(bucket_date.isoformat(), 0),
                }
                for bucket_date in bucket_dates
            ]
            range_start = start_date
            range_end = end_date
            anchor_date = end_date.isoformat()
            anchor_month = ''
        else:
            if anchor_month_value:
                anchor_match = re.fullmatch(r'(\d{4})-(\d{2})', anchor_month_value)
                if not anchor_match:
                    return Response({'detail': 'anchor_month must be in YYYY-MM format.'}, status=status.HTTP_400_BAD_REQUEST)

                anchor_year = int(anchor_match.group(1))
                anchor_month_number = int(anchor_match.group(2))
                if anchor_month_number < 1 or anchor_month_number > 12:
                    return Response({'detail': 'anchor_month must be in YYYY-MM format.'}, status=status.HTTP_400_BAD_REQUEST)

                end_month = date(anchor_year, anchor_month_number, 1)
                current_month = today.replace(day=1)
                if end_month > current_month:
                    end_month = current_month
            else:
                end_month = today.replace(day=1)

            start_month = _add_months(end_month, -(periods - 1))
            next_month = _add_months(end_month, 1)
            grouped_rows = (
                users
                .filter(created_at__date__gte=start_month, created_at__date__lt=next_month)
                .annotate(period=TruncMonth('created_at'))
                .values('period')
                .annotate(count=Count('id'))
                .order_by('period')
            )

            count_map = {}
            for row in grouped_rows:
                raw_period = row.get('period')
                if not raw_period:
                    continue
                period_date = raw_period.date() if hasattr(raw_period, 'date') else raw_period
                count_map[period_date.isoformat()] = row['count']

            bucket_months = [_add_months(start_month, index) for index in range(periods)]
            series = [
                {
                    'key': bucket_month.isoformat(),
                    'label': bucket_month.strftime('%b %Y'),
                    'short_label': bucket_month.strftime('%b'),
                    'count': count_map.get(bucket_month.isoformat(), 0),
                }
                for bucket_month in bucket_months
            ]
            range_start = start_month
            range_end = end_month
            anchor_date = ''
            anchor_month = end_month.strftime('%Y-%m')

        total_users = sum(point['count'] for point in series)
        peak_users = max((point['count'] for point in series), default=0)

        return Response({
            'grouping': grouping,
            'periods': periods,
            'range_start': range_start.isoformat(),
            'range_end': range_end.isoformat(),
            'anchor_date': anchor_date,
            'anchor_month': anchor_month,
            'total_users': total_users,
            'peak_users': peak_users,
            'series': series,
        })


class AdminUserListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        try:
            limit = max(1, min(int(request.query_params.get('limit', 10)), 100))
            offset = max(0, int(request.query_params.get('offset', 0)))
        except ValueError:
            return Response({'detail': 'Invalid pagination values.'}, status=status.HTTP_400_BAD_REQUEST)

        search_text = request.query_params.get('searchText', '').strip()
        segment = request.query_params.get('segment', 'all').strip().lower() or 'all'
        created_on = request.query_params.get('created_on', '').strip()
        queryset = _get_admin_user_queryset().order_by('-created_at', '-id')

        if segment not in {'all', 'today'}:
            return Response({'detail': "segment must be either 'all' or 'today'."}, status=status.HTTP_400_BAD_REQUEST)

        if segment == 'today':
            queryset = queryset.filter(created_at__date=timezone.localdate())

        if created_on:
            try:
                created_on_date = date.fromisoformat(created_on)
            except ValueError:
                return Response({'detail': 'created_on must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(created_at__date=created_on_date)

        if search_text:
            queryset = queryset.filter(
                Q(username__icontains=search_text)
                | Q(email__icontains=search_text)
                | Q(phone__icontains=search_text)
            )

        total_count = queryset.count()
        users = queryset[offset: offset + limit]

        return Response({
            'count': total_count,
            'results': [_serialize_admin_user(user) for user in users],
            'limit': limit,
            'offset': offset,
        })


class UserDetailApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_serialize_user(request.user), status=status.HTTP_200_OK)

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
            return Response({'detail': 'Email cannot be changed for Google login accounts.'}, status=status.HTTP_400_BAD_REQUEST)

        user.username = profile['username']
        user.email = profile['email']
        user.phone = profile['phone']
        user.save(update_fields=['username', 'email', 'phone', 'modified_at'])

        return Response(_serialize_user(user), status=status.HTTP_200_OK)


@api_view(['POST'])
def google_login(request):
    token = request.data.get('token')

    if not token:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=300,
        )

        email = idinfo['email']
        name = idinfo.get('name', '')
        google_uid = idinfo.get('sub')
        profile_image = idinfo.get('picture')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': name,
                'is_google_login': True,
                'google_uid': google_uid,
                'auth_source': UserAuthSource.GOOGLE,
            }
        )

        if not created:
            user.is_google_login = True
            user.google_uid = google_uid
            user.auth_source = UserAuthSource.GOOGLE
            user.save(update_fields=['is_google_login', 'google_uid', 'auth_source', 'modified_at'])

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
                'profile_image': profile_image,
            }
        }, status=status.HTTP_200_OK)
    except ValueError as e:
        error_msg = str(e)
        if 'Token expired' in error_msg:
            return Response({'error': 'Token expired', 'detail': 'Your Google session has expired. Please try signing in again.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'error': 'Invalid token', 'detail': error_msg}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Server error', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
