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


class Categories(models.Model):
    categorie = models.CharField(max_length=255)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    slug = models.SlugField(unique=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.categorie)
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['categorie']

    def __str__(self):
        return self.categorie
