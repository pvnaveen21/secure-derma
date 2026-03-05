from django.db import models

class ImageFile(models.Model):
    TYPE_CHOICES = (
        ("main_image", "Main Image"),
        ("landing_page", "Landing Page"),
        ("why_secure_derma", "Why Secure Derma"),
        # Skin
        ("skin_thumbnail", "Skin Thumbnail"),
        ("skin_banner", "Skin Banner"),

        # Hair
        ("hair_thumbnail", "Hair Thumbnail"),
        ("hair_banner", "Hair Banner"),

        # Supplement
        ("supplement_thumbnail", "Supplement Thumbnail"),
        ("supplement_banner", "Supplement Banner"),

        # Pediatric
        ("pediatric", "Pediatric"),
        ("pediatric_banner", "Pediatric Banner"),

        # Shop All
        ("shop_all", "Shop All"),
    )

    image = models.ImageField(upload_to='uploads/')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.id}"
