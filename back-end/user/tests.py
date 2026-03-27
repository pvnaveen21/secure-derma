from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from user.models import User, UserAuthSource


class UserDetailApiViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='profile@example.com',
            password='Password123!',
            username='Secure Derma',
            phone='9876543210',
        )
        self.url = '/api/users/user/me/'
        self.client.force_authenticate(user=self.user)

    def test_patch_updates_profile(self):
        response = self.client.patch(
            self.url,
            {
                'username': 'Naveen PV',
                'email': 'naveen@example.com',
                'phone': '9123456789',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'Naveen PV')
        self.assertEqual(self.user.email, 'naveen@example.com')
        self.assertEqual(self.user.phone, '9123456789')

    def test_patch_rejects_duplicate_email(self):
        User.objects.create_user(
            email='existing@example.com',
            password='Password123!',
            username='Existing User',
            phone='9234567890',
        )

        response = self.client.patch(
            self.url,
            {
                'username': 'Secure Derma',
                'email': 'existing@example.com',
                'phone': '9876543210',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'This email address is already in use.')

    def test_google_login_user_cannot_change_email(self):
        self.user.is_google_login = True
        self.user.auth_source = UserAuthSource.GOOGLE
        self.user.save(update_fields=['is_google_login', 'auth_source'])

        response = self.client.patch(
            self.url,
            {
                'username': 'Secure Derma',
                'email': 'changed@example.com',
                'phone': '9876543210',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Email cannot be changed for Google login accounts.')


class UserTokenRefreshViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='refresh@example.com',
            password='Password123!',
            username='Refresh User',
            phone='9988776655',
        )
        self.url = '/api/auth/token/refresh/'

    def test_refresh_returns_new_access_token_for_valid_refresh_token(self):
        refresh = RefreshToken.for_user(self.user)

        response = self.client.post(
            self.url,
            {'refresh': str(refresh)},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['message'], 'Token refreshed successfully.')

    def test_refresh_token_lifetime_is_extended_beyond_default_one_day(self):
        self.assertEqual(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].days, 30)


class AdminUserDashboardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='Password123!',
            username='Admin User',
            phone='9000000001',
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.admin)

        now = timezone.now()
        self.today_user = User.objects.create_user(
            email='today@example.com',
            password='Password123!',
            username='Today User',
            phone='9000000002',
            is_google_login=True,
            auth_source=UserAuthSource.GOOGLE,
        )
        self.month_user = User.objects.create_user(
            email='month@example.com',
            password='Password123!',
            username='Month User',
            phone='9000000003',
            auth_source=UserAuthSource.PHONE,
        )
        self.old_user = User.objects.create_user(
            email='old@example.com',
            password='Password123!',
            username='Old User',
            phone='9000000004',
            auth_source=UserAuthSource.EMAIL,
        )

        User.objects.filter(pk=self.today_user.pk).update(created_at=now)
        User.objects.filter(pk=self.month_user.pk).update(created_at=now - timedelta(days=10))
        User.objects.filter(pk=self.old_user.pk).update(created_at=now - timedelta(days=40))

    def test_admin_user_summary_returns_source_counts(self):
        response = self.client.get('/api/admin/users/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['total_users'], 3)
        self.assertEqual(response.data['summary']['today_new_users'], 1)
        self.assertEqual(response.data['summary']['google_users'], 1)
        self.assertEqual(response.data['summary']['mobile_users'], 1)
        self.assertEqual(response.data['summary']['email_users'], 1)

    def test_admin_user_analytics_supports_daily_grouping_with_anchor_date(self):
        anchor_date = timezone.localdate().strftime('%Y-%m-%d')
        response = self.client.get('/api/admin/users/analytics/', {'grouping': 'day', 'periods': 30, 'anchor_date': anchor_date})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['grouping'], 'day')
        self.assertEqual(response.data['periods'], 30)
        self.assertEqual(response.data['anchor_date'], anchor_date)
        self.assertEqual(len(response.data['series']), 30)

    def test_admin_user_analytics_supports_month_grouping(self):
        anchor_month = timezone.localdate().strftime('%Y-%m')
        response = self.client.get('/api/admin/users/analytics/', {'grouping': 'month', 'periods': 3, 'anchor_month': anchor_month})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['grouping'], 'month')
        self.assertEqual(response.data['periods'], 3)
        self.assertEqual(response.data['anchor_month'], anchor_month)
        self.assertEqual(len(response.data['series']), 3)
        self.assertGreaterEqual(response.data['total_users'], 2)

    def test_admin_user_list_filters_today_segment(self):
        response = self.client.get('/api/admin/users/', {'segment': 'today'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['email'], 'today@example.com')
        self.assertEqual(response.data['results'][0]['auth_source'], 'google')
