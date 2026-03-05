from rest_framework import serializers
from .models import Brand

class BrandSerializer(serializers.ModelSerializer):
    brand_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Brand
        fields = "__all__"
    
    def get_brand_image(self, obj):
        request = self.context.get('request')
        if obj.brand_image and request:
            return request.build_absolute_uri(obj.brand_image.url)
        return None
        
    def validate(self, attrs):
        brand_name = attrs.get("brand_name")

        # When updating, exclude self
        if self.instance:
            if Brand.objects.filter(
                brand_name=brand_name,
                is_deleted=False
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    "error": "Brand name already exists."
                })
        else:
            # On create
            if Brand.objects.filter(
                brand_name=brand_name,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError({
                    "error": "Brand name already exists."
                })

        return attrs
