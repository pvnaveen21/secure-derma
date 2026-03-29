from django.db import models
from django.utils.text import slugify

from categorie.models import Categories


def unique_slugify(instance, value, slug_field_name='slug'):
    slug = slugify(value)
    ModelClass = instance.__class__
    unique_slug = slug
    num = 1
    queryset = ModelClass.objects.all()
    if instance.pk:
        queryset = queryset.exclude(pk=instance.pk)

    while queryset.filter(**{slug_field_name: unique_slug}).exists():
        unique_slug = f"{slug}-{num}"
        num += 1

    return unique_slug


class ProductType(models.Model):
    categorie = models.ForeignKey(Categories, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='producttype/', null=True, blank=True)
    show_banner = models.BooleanField(default=False)
    show_home = models.BooleanField(default=False)
    show_filter = models.BooleanField(default=False)
    product_type = models.CharField(max_length=255)
    is_deleted = models.BooleanField(default=False)
    slug = models.SlugField(unique=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        should_update_slug = not self.slug

        if self.pk:
            original = ProductType.objects.filter(pk=self.pk).only('product_type').first()
            should_update_slug = should_update_slug or (
                original is not None and original.product_type != self.product_type
            )

        if should_update_slug:
            self.slug = unique_slugify(self, self.product_type)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.product_type
