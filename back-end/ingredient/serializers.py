from rest_framework import serializers
from .models import Ingredients

class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredients
        fields = "__all__"

    def validate(self, attrs):
        ingredient = attrs.get("ingredient")

        # On update — exclude itself
        if self.instance:
            if Ingredients.objects.filter(
                ingredient=ingredient,
                is_deleted=False
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({
                    "error": "Ingredient concern already exists."
                })
        else:
            # On create
            if Ingredients.objects.filter(
                ingredient=ingredient,
                is_deleted=False
            ).exists():
                raise serializers.ValidationError({
                    "error": "Ingredient concern already exists."
                })

        return attrs
