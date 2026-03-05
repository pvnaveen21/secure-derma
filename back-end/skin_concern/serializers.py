from rest_framework import serializers
from .models import SkinConcerns

class SkinConcernsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkinConcerns
        fields = "__all__"

    def validate(self, attrs):
        skin_concern = attrs.get("skin_concern")

        # On update — exclude itself
        if self.instance:
            if SkinConcerns.objects.filter(
                skin_concern=skin_concern,
                is_deleted=False
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    "error": "Skin concern already exists."
                })
        else:
            # On create
            if SkinConcerns.objects.filter(
                skin_concern=skin_concern,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError({
                    "error": "Skin concern already exists."
                })

        return attrs
