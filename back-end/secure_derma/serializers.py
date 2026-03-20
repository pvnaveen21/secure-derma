# serializers.py
from rest_framework import serializers

from hair_concern.models import HairConcerns
from ingredient.models import Ingredients
from product_type.models import ProductType
from skin_concern.models import SkinConcerns
from product.models import Product, ProductDetails, ProductImage, ProductReview
from django.conf import settings
from .models import SecureDermaNewsletterSubscriber


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ProductDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDetails
        exclude = ['available_stock_count', 'is_deleted']


class ProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.brand', read_only=True)
    brand_slug = serializers.CharField(source='brand.slug', read_only=True)
    category_name = serializers.CharField(source='categorie.categorie', read_only=True)
    category_slug = serializers.CharField(source='categorie.slug', read_only=True)
    product_type_name = serializers.CharField(source='product_type.product_type', read_only=True)
    product_type_slug = serializers.CharField(source='product_type.slug', read_only=True)
    
    skin_concerns = serializers.StringRelatedField(many=True, source='skin_concern')
    hair_concerns = serializers.StringRelatedField(many=True, source='hair_concern')
    ingredients = serializers.StringRelatedField(many=True, source='ingredient')
    
    # Full image URLs
    thumbnail_image_url = serializers.SerializerMethodField()
    hover_image_url = serializers.SerializerMethodField()
    
    product_details = ProductDetailsSerializer(many=True, read_only=True)
    images = serializers.SerializerMethodField()
    
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'product_name', 'brand_name', 'brand_slug',
            'category_name', 'category_slug', 'product_type_name', 'product_type_slug',
            'skin_concerns', 'hair_concerns', 'ingredients',
            'thumbnail_image', 'thumbnail_image_url',
            'hover_image', 'hover_image_url',
            'product_description',
            'key_benefits', 'key_ingredients', 'how_to_use',
            'trending_product', 'best_seller', 'created_at',
            'product_details', 'images', 'avg_rating', 'review_count'
        ]
    
    def get_thumbnail_image_url(self, obj):
        if obj.thumbnail_image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.thumbnail_image.url)
            return obj.thumbnail_image.url
        return None
    
    def get_hover_image_url(self, obj):
        if obj.hover_image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.hover_image.url)
            return obj.hover_image.url
        return None
    
    def get_images(self, obj):
        images = obj.images.filter(is_deleted=False)
        serializer = ProductImageSerializer(images, many=True, context=self.context)
        return serializer.data

    def get_avg_rating(self, obj):
        reviews = obj.reviews.filter(is_deleted=False)
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / reviews.count(), 1)
        return 0

    def get_review_count(self, obj):
        return obj.reviews.filter(is_deleted=False).count()
    
    



class HairConcernSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="hair_concern")

    class Meta:
        model = HairConcerns
        fields = ["id", "name", "slug"]


class SkinConcernSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="skin_concern")

    class Meta:
        model = SkinConcerns
        fields = ["id", "name", "slug"]


class IngredientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="ingredient")

    class Meta:
        model = Ingredients
        fields = ["id", "name", "slug"]


class ProductTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="product_type")

    class Meta:
        model = ProductType
        fields = ["id", "name", "slug"]


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()

    class Meta:
        model = SecureDermaNewsletterSubscriber
        fields = ["email"]
