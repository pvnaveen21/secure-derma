from rest_framework import status
from rest_framework.test import APITestCase

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
