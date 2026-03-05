# users/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')  # or whatever your admin role is

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class UserRole(models.TextChoices):
    ADMIN  = 'admin',  'Admin'
    USER   = 'user',   'User'
    DOCTOR = 'doctor', 'Doctor'


class User(AbstractBaseUser, PermissionsMixin):  # ← important: add PermissionsMixin if you use groups/permissions
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True)  # optional
    phone = models.CharField(max_length=15, unique=True, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)

    is_google_login = models.BooleanField(default=False)
    google_uid = models.CharField(max_length=255, blank=True, null=True)

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.USER
    )

    # Required for admin & auth system
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)      # can access admin?
    is_superuser = models.BooleanField(default=False)  # full permissions?

    # Audit fields from your abstract
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    modified_at = models.DateTimeField(auto_now=True, null=True)
    is_deleted = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="%(class)s_created_by"
    )
    # ... updated_by, deleted_by ...

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # add e.g. ['phone'] if you want them required for createsuperuser

    def __str__(self):
        return self.email

    # These two are now provided by AbstractBaseUser:
    # is_authenticated = True (property)
    # is_anonymous = False (property)