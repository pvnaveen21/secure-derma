from django.db import models

from brand.models import Brand
from categorie.models import Categories
from hair_concern.models import HairConcerns
from ingredient.models import Ingredients
from product_type.models import ProductType
from skin_concern.models import SkinConcerns
from django.utils.text import slugify
from django.conf import settings


class Product(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE)
    product_type = models.ForeignKey(ProductType, on_delete=models.CASCADE)
    categorie = models.ForeignKey(Categories, on_delete=models.CASCADE)
    product_name = models.CharField(max_length=255)
    
    skin_concern = models.ManyToManyField(SkinConcerns, blank=True)
    hair_concern = models.ManyToManyField(HairConcerns, blank=True)
    ingredient = models.ManyToManyField(Ingredients, blank=True)
    
    
    thumbnail_image = models.ImageField(upload_to="products/thumbnail/", blank=True, null=True)
    hover_image = models.ImageField(upload_to="products/hover/", blank=True, null=True)

    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    product_description = models.TextField(blank=True, null=True)
    key_benefits = models.JSONField(blank=True, default=list)
    key_ingredients = models.JSONField(blank=True, default=list)
    how_to_use = models.JSONField(blank=True, default=list)
    trending_product = models.BooleanField(default=False)
    best_seller = models.BooleanField(default=False)
    slug = models.SlugField(max_length=255, unique=True, blank=True ,null=True , db_index=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            # Auto-generate slug from product_name
            self.slug = slugify(self.product_name)
            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while Product.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)
    
    
    

    class Meta:
        db_table = "products"
        ordering = ["-created_at"]
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return self.product_name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/gallery/")
    is_deleted = models.BooleanField(default=False)


class ProductDetails(models.Model):
    product = models.ForeignKey(Product, related_name="product_details", on_delete=models.CASCADE)
    product_weight = models.CharField(max_length=50)
    weight_type = models.CharField(max_length=50)
    combo = models.IntegerField(default=1)
    original_price = models.IntegerField()
    selling_price = models.IntegerField()
    available_stock_count = models.IntegerField()
    discount_price = models.IntegerField()
    is_deleted = models.BooleanField(default=False)

class ProductReview(models.Model):
    product = models.ForeignKey(Product, related_name="reviews", on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='product_reviews'   # ← highly recommended: makes reverse queries nicer
    ) 
    reviewer_name = models.CharField(max_length=255, blank=True, null=True)
    review_text = models.TextField(blank=True, null=True)
    rating = models.IntegerField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.product_name} - {self.rating}"

class ProductReviewImage(models.Model):
    review = models.ForeignKey(ProductReview, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="products/reviews/")

