from django.db import models
from django.utils.text import slugify

from categorie.models import Categories


def unique_slugify(instance, value, slug_field_name='slug'):
    slug = slugify(value)
    ModelClass = instance.__class__
    unique_slug = slug
    num = 1

    while ModelClass.objects.filter(**{slug_field_name: unique_slug}).exists():
        unique_slug = f"{slug}-{num}"
        num += 1

    return unique_slug


class ProductType(models.Model):
    categorie = models.ForeignKey(Categories, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='producttype/', null=True, blank=True)
    show_banner = models.BooleanField(default=False)
    show_home = models.BooleanField(default=False)
    product_type = models.CharField(max_length=255)
    is_deleted = models.BooleanField(default=False)
    slug = models.SlugField(unique=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.product_type)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.product_type