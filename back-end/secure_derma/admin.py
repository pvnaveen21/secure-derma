from django.contrib import admin

from .models import SecureDermaNewsletterSubscriber


@admin.register(SecureDermaNewsletterSubscriber)
class SecureDermaNewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "source", "is_active", "created_at")
    search_fields = ("email", "source")
    list_filter = ("is_active", "source", "created_at")
