from rest_framework import serializers
from .models import ImageFile

class ImageFileSerializer(serializers.ModelSerializer):
    # SerializerMethodField only for read
    full_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ImageFile
        fields = ['id', 'image', 'type', 'is_deleted', 'created_at', 'full_image_url']

    def get_full_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None
