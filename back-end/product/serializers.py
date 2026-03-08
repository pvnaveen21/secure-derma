import json
from rest_framework import serializers
from brand.models import Brand
from categorie.models import Categories
from product_type.models import ProductType
from product.models import Product, ProductDetails, ProductImage, ProductReview, ProductReviewImage

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']
        
        
class ProductDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDetails
        fields = [
            'id', 'product_weight', 'weight_type', 'combo',
            'original_price', 'selling_price', 'available_stock_count','discount_price'
        ]
        
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'brand_name']

class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ['id', 'product_type']
        
class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categories
        fields = ['id', 'categorie']

class ProductListSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    product_type = ProductTypeSerializer(read_only=True)
    categorie = CategorieSerializer(read_only=True)
    details = ProductDetailsSerializer(many=True, source='product_details', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    skin_concern = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    hair_concern = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    ingredient = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    avg_rating = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'brand', 'product_type','categorie', 'product_name',
            'skin_concern', 'hair_concern','ingredient',
            'thumbnail_image', 'hover_image',
            'details', 'images','product_description',
            'key_benefits' ,'key_ingredients' ,'how_to_use' ,'trending_product','best_seller',
            'avg_rating', 'rating_count'
        ]

    def get_avg_rating(self, obj):
        avg_rating = getattr(obj, 'avg_rating_value', None)
        return round(avg_rating, 1) if avg_rating else 0.0

    def get_rating_count(self, obj):
        return getattr(obj, 'total_reviews', 0) or 0


class ProductSerializer(serializers.ModelSerializer):
    details = ProductDetailsSerializer(source='product_details', many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    
    # key_benefits = serializers.JSONField(required=False)
    # key_ingredients = serializers.JSONField(required=False)
    # how_to_use = serializers.JSONField(required=False)

    class Meta:
        model = Product
        fields = [
            'id', 'brand', 'product_type','categorie', 'product_name',
            'skin_concern', 'hair_concern','ingredient',
            'thumbnail_image', 'hover_image',
            'details', 'images', 'key_benefits','key_ingredients','how_to_use','product_description','trending_product','best_seller'
        ]


    def create(self, validated_data):
        request = self.context['request']
        
        # Extract JSON fields if they were converted
        key_benefits = validated_data.pop('key_benefits', [])
        key_ingredients = validated_data.pop('key_ingredients', [])
        how_to_use = validated_data.pop('how_to_use', [])
        
        # 1️⃣ Create Product
        product = Product.objects.create(
            brand=validated_data['brand'],
            product_type=validated_data['product_type'],
            categorie=validated_data['categorie'],
            product_name=validated_data['product_name'],
            thumbnail_image=validated_data.get('thumbnail_image'),
            hover_image=validated_data.get('hover_image'),
            product_description=validated_data.get('product_description'),
            key_benefits=key_benefits,
            key_ingredients=key_ingredients,
            how_to_use=how_to_use,
            trending_product=validated_data['trending_product'],
            best_seller=validated_data['best_seller']

        )

        # --- Key Benefits ---
        key_benefits_str = request.data.get("key_benefits")
        if key_benefits_str:
            try:
                product.key_benefits = json.loads(key_benefits_str)
            except json.JSONDecodeError:
                product.key_benefits = [key_benefits_str]

        # --- Key Ingredients ---
        key_ingredients_str = request.data.get("key_ingredients")
        if key_ingredients_str:
            try:
                product.key_ingredients = json.loads(key_ingredients_str)
            except json.JSONDecodeError:
                product.key_ingredients = [key_ingredients_str]

        # --- How To Use ---
        how_to_use_str = request.data.get("how_to_use")
        if how_to_use_str:
            try:
                product.how_to_use = json.loads(how_to_use_str)
            except json.JSONDecodeError:
                product.how_to_use = [how_to_use_str]

        product.save()  # Save the changes to the product object

        # 2️⃣ Set M2M relationships
        skin_ids = request.data.getlist("skin_concern")
        hair_ids = request.data.getlist("hair_concern")
        ingredient_ids = request.data.getlist("ingredient")
        

        if skin_ids:
            product.skin_concern.set(skin_ids)

        if hair_ids:
            product.hair_concern.set(hair_ids)
            
        if ingredient_ids:
            product.ingredient.set(ingredient_ids)
        
        # 3️⃣ Parse and save product details
        details_dict = {}
        for key, value in request.data.items():
            if key.startswith("details["):
                idx = key[key.find("[")+1:key.find("]")]
                field = key.split("].")[1]

                details_dict.setdefault(idx, {})
                details_dict[idx][field] = value

        for i, d in details_dict.items():
            ProductDetails.objects.create(
                product=product,
                product_weight=d.get("product_weight"),
                weight_type=d.get("weight_type"),
                combo=d.get("combo"),
                original_price=d.get("original_price"),
                selling_price=d.get("selling_price"),
                available_stock_count=d.get("available_stock_count"),
                discount_price=d.get("discount_price")
            )

        # 4️⃣ Save product images
        images = request.FILES.getlist("images")
        for img in images:
            ProductImage.objects.create(product=product, image=img)

        return product

class ProductReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReviewImage
        fields = ["id", "image"]


class ProductReviewSerializer(serializers.ModelSerializer):
    images = ProductReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "product",
            "user",
            "reviewer_name",
            "review_text",
            "rating",
            "created_at",
            "images",
        ]
        read_only_fields = ["product", "user", "created_at"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
