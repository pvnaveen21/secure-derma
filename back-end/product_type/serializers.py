from rest_framework import serializers
from .models import ProductType

class ProductTypeSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductType
        fields = "__all__"
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def validate(self, attrs):
        product_type = attrs.get("product_type")
        # When updating — exclude itself
        if self.instance:
            if ProductType.objects.filter(
                product_type=product_type,
                is_deleted=False
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    "error": "Product type already exists."
                })
        else:
            # When creating
            if ProductType.objects.filter(
                product_type=product_type,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError({
                    "error": "Product type already exists."
                })
        return attrs