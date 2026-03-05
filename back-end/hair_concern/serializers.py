from rest_framework import serializers
from .models import HairConcerns

class HairConcernsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HairConcerns
        fields = "__all__"

    def validate(self, attrs):
        hair_concern = attrs.get("hair_concern")

        # On update — exclude itself
        if self.instance:
            if HairConcerns.objects.filter(
                hair_concern=hair_concern,
                is_deleted=False
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    "error": "Hair concern already exists."
                })
        else:
            # On create
            if HairConcerns.objects.filter(
                hair_concern=hair_concern,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError({
                    "error": "Hair concern already exists."
                })

        return attrs
