from rest_framework import status
from rest_framework.test import APITestCase
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from user.models import User


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
        self.user.save(update_fields=['is_google_login'])

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
