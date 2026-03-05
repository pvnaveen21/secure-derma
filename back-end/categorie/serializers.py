# serializers.py
from rest_framework import serializers
from .models import Categories


class CategoriesSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Categories
        fields = "__all__"

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def validate(self, attrs):
        categorie = attrs.get("categorie")
        if self.instance:
            if Categories.objects.filter(
                categorie=categorie,
                is_deleted=False
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    "error": "Category already exists."
                })
        else:
            if Categories.objects.filter(
                categorie=categorie,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError({
                    "error": "Category already exists."
                })
        return attrs