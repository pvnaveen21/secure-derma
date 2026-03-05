from django.db import models
from django.utils.text import slugify

def unique_slugify(instance, value, slug_field_name='slug'):
    slug = slugify(value)
    ModelClass = instance.__class__
    unique_slug = slug
    num = 1
    while ModelClass.objects.filter(**{slug_field_name: unique_slug}).exists():
        unique_slug = f"{slug}-{num}"
        num += 1
    return unique_slug

class Brand(models.Model):
    brand_name = models.CharField(max_length=255)
    brand_image = models.ImageField(
        upload_to='brands/',
        blank=True,
        null=True
    )
    brand_description = models.TextField(blank=True, null=True)
    show_brand = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    is_top_brand = models.BooleanField(default=False)
    slug = models.SlugField(unique=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.brand_name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.brand_name
